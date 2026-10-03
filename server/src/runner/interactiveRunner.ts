import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, spawn, ChildProcess } from 'child_process';
import { Socket } from 'socket.io';

interface ActiveExecution {
  child: ChildProcess;
  tempFiles: string[];
  tempDirs: string[];
  timer: NodeJS.Timeout;
  startTime: number;
}

function getSafeEnvironment(): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH || '',
    TEMP: process.env.TEMP || os.tmpdir(),
    TMP: process.env.TMP || os.tmpdir(),
    SYSTEMROOT: process.env.SYSTEMROOT || '',
    HOME: process.env.HOME || os.homedir(),
    USER: process.env.USER || 'runner',
    LANG: 'en_US.UTF-8',
    PYTHONIOENCODING: 'utf-8',
    PYTHONUNBUFFERED: '1',
  };
}

export class InteractiveRunnerManager {
  private tempDir: string;
  private activeSessions = new Map<string, ActiveExecution>();

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'kollab_runner');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  private cleanOutput(text: string, id: string, filename?: string): string {
    if (!text) return '';
    const cleanName = filename ? path.basename(filename) : 'source';
    const escapedTemp = this.tempDir.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
    const tempRegex = new RegExp(`(?:[A-Za-z]:\\\\[^:\\r\\n]*?|${escapedTemp})[\\\\/]${id}\\.[a-zA-Z0-9]+`, 'gi');
    let res = text.replace(tempRegex, cleanName);
    const idRegex = new RegExp(`${id}\\.[a-zA-Z0-9]+`, 'gi');
    res = res.replace(idRegex, cleanName);
    return res;
  }

  private killProcess(pid: number) {
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${pid} /T /F`, () => {});
    } else {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // Process might have already exited
      }
    }
  }

  public killSession(socketId: string, reason?: string, socket?: Socket) {
    const session = this.activeSessions.get(socketId);
    if (!session) return;

    clearTimeout(session.timer);
    if (session.child.pid) {
      this.killProcess(session.child.pid);
    }

    // Cleanup temp files
    session.tempFiles.forEach((file) => {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch {}
    });

    session.tempDirs.forEach((dir) => {
      try {
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
      } catch {}
    });

    this.activeSessions.delete(socketId);

    if (reason && socket) {
      socket.emit('terminal:output', { type: 'system', text: `^C [${reason}]` });
      socket.emit('terminal:exit', { exitCode: 130, executionTimeMs: Date.now() - session.startTime });
    }
  }

  public registerSocket(socket: Socket) {
    socket.on('terminal:run_code', async (payload: {
      language: string;
      code: string;
      filename?: string;
      initialInput?: string;
    }) => {
      // Terminate any currently running process for this socket first
      this.killSession(socket.id);

      const lang = (payload.language || 'plaintext').toLowerCase();
      const id = 'run_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const isWin = process.platform === 'win32';
      const safeEnv = getSafeEnvironment();
      const startTime = Date.now();

      const tempFiles: string[] = [];
      const tempDirs: string[] = [];

      socket.emit('terminal:started', {
        filename: payload.filename || 'script',
        language: lang,
      });

      try {
        let spawnCmd = '';
        let spawnArgs: string[] = [];
        let cwd = this.tempDir;

        // 1. C++ / C
        if (lang === 'cpp' || lang === 'c++' || lang === 'c') {
          const isCpp = lang === 'cpp' || lang === 'c++';
          const ext = isCpp ? '.cpp' : '.c';
          const srcFile = path.join(this.tempDir, `${id}${ext}`);
          const binFile = path.join(this.tempDir, isWin ? `${id}.exe` : `${id}.out`);
          tempFiles.push(srcFile, binFile);

          fs.writeFileSync(srcFile, payload.code, 'utf-8');

          const compiler = isCpp ? 'g++ -O2 -std=c++17 -Wall' : 'gcc -O2 -Wall';
          const compileCmd = `${compiler} "${srcFile}" -o "${binFile}"`;

          const compileResult = await new Promise<{ error: Error | null; stderr: string }>((resolve) => {
            exec(compileCmd, { timeout: 8000, maxBuffer: 512 * 1024, env: safeEnv }, (error, _stdout, stderr) => {
              resolve({ error, stderr });
            });
          });

          if (compileResult.error || !fs.existsSync(binFile)) {
            const errText = this.cleanOutput(compileResult.stderr || (compileResult.error ? compileResult.error.message : 'Compilation failed.'), id, payload.filename);
            socket.emit('terminal:output', { type: 'stderr', text: errText.trim() });
            socket.emit('terminal:exit', { exitCode: 1, executionTimeMs: Date.now() - startTime });
            // Clean files
            tempFiles.forEach((f) => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {} });
            return;
          }

          spawnCmd = binFile;
          spawnArgs = [];
        }

        // 2. Python
        else if (lang === 'python' || lang === 'py') {
          const srcFile = path.join(this.tempDir, `${id}.py`);
          tempFiles.push(srcFile);
          fs.writeFileSync(srcFile, payload.code, 'utf-8');

          spawnCmd = 'python';
          spawnArgs = ['-u', srcFile];
        }

        // 3. Node.js / JavaScript / TypeScript
        else if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
          const srcFile = path.join(this.tempDir, `${id}.js`);
          tempFiles.push(srcFile);
          fs.writeFileSync(srcFile, payload.code, 'utf-8');

          spawnCmd = 'node';
          spawnArgs = [srcFile];
        }

        // 4. Java
        else if (lang === 'java') {
          const match = payload.code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
          const className = match ? match[1] : 'Main';
          const javaDir = path.join(this.tempDir, id);
          tempDirs.push(javaDir);
          fs.mkdirSync(javaDir, { recursive: true });

          const javaFile = path.join(javaDir, `${className}.java`);
          fs.writeFileSync(javaFile, payload.code, 'utf-8');

          const compileCmd = `javac "${javaFile}"`;
          const compileResult = await new Promise<{ error: Error | null; stderr: string }>((resolve) => {
            exec(compileCmd, { cwd: javaDir, timeout: 8000, env: safeEnv }, (error, _stdout, stderr) => {
              resolve({ error, stderr });
            });
          });

          if (compileResult.error) {
            const errText = this.cleanOutput(compileResult.stderr || 'Java compilation failed.', id, payload.filename);
            socket.emit('terminal:output', { type: 'stderr', text: errText.trim() });
            socket.emit('terminal:exit', { exitCode: 1, executionTimeMs: Date.now() - startTime });
            try { fs.rmSync(javaDir, { recursive: true, force: true }); } catch {}
            return;
          }

          spawnCmd = 'java';
          spawnArgs = [className];
          cwd = javaDir;
        }

        // Unsupported language
        else {
          socket.emit('terminal:output', {
            type: 'stderr',
            text: `Language '${lang}' execution is not supported. Supported: c, cpp, python, javascript, java`,
          });
          socket.emit('terminal:exit', { exitCode: 1, executionTimeMs: 0 });
          return;
        }

        // Spawn child process
        const child = spawn(spawnCmd, spawnArgs, {
          cwd,
          env: safeEnv,
          windowsHide: true,
        });

        // Maximum timeout: 60 seconds
        const timer = setTimeout(() => {
          socket.emit('terminal:output', {
            type: 'stderr',
            text: '[Time Limit Exceeded]: Process was terminated after 60s runtime.',
          });
          this.killSession(socket.id);
        }, 60000);

        this.activeSessions.set(socket.id, {
          child,
          tempFiles,
          tempDirs,
          timer,
          startTime,
        });

        // Pipe initialInput if provided (e.g. from Custom Input drawer)
        if (payload.initialInput && child.stdin && child.stdin.writable) {
          child.stdin.write(payload.initialInput);
        }

        child.stdout?.on('data', (chunk) => {
          const text = this.cleanOutput(chunk.toString(), id, payload.filename);
          socket.emit('terminal:output', { type: 'stdout', text });
        });

        child.stderr?.on('data', (chunk) => {
          const text = this.cleanOutput(chunk.toString(), id, payload.filename);
          socket.emit('terminal:output', { type: 'stderr', text });
        });

        child.on('close', (code) => {
          clearTimeout(timer);
          const duration = Date.now() - startTime;
          this.activeSessions.delete(socket.id);

          // Cleanup temp files
          tempFiles.forEach((f) => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {} });
          tempDirs.forEach((d) => { try { if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true }); } catch {} });

          socket.emit('terminal:exit', {
            exitCode: code !== null ? code : 0,
            executionTimeMs: duration,
          });
        });

        child.on('error', (err) => {
          clearTimeout(timer);
          this.activeSessions.delete(socket.id);
          socket.emit('terminal:output', { type: 'stderr', text: `Failed to spawn runner process: ${err.message}` });
          socket.emit('terminal:exit', { exitCode: 1, executionTimeMs: Date.now() - startTime });
        });

      } catch (err: any) {
        socket.emit('terminal:output', { type: 'stderr', text: `Execution initialization error: ${err.message}` });
        socket.emit('terminal:exit', { exitCode: 1, executionTimeMs: Date.now() - startTime });
      }
    });

    // Receive live user stdin from terminal input line
    socket.on('terminal:stdin', (data: { text: string }) => {
      const session = this.activeSessions.get(socket.id);
      if (session && session.child.stdin && session.child.stdin.writable) {
        session.child.stdin.write(data.text);
      }
    });

    // Close stdin (EOF) if user signals end of input
    socket.on('terminal:stdin_eof', () => {
      const session = this.activeSessions.get(socket.id);
      if (session && session.child.stdin && session.child.stdin.writable) {
        session.child.stdin.end();
      }
    });

    // User pressed Ctrl+C or stopped execution
    socket.on('terminal:kill', () => {
      this.killSession(socket.id, 'Process terminated by user', socket);
    });

    // Clean up when client disconnects
    socket.on('disconnect', () => {
      this.killSession(socket.id);
    });
  }
}

export const interactiveRunner = new InteractiveRunnerManager();
