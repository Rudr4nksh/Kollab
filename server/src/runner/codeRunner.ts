import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, spawn } from 'child_process';

export interface CodeExecutionRequest {
  language: string;
  code: string;
  input?: string;
  filename?: string;
}

export interface CodeExecutionResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  compilerError?: string;
}

// Sanitized environment: Strips all sensitive server variables (secrets, DB URLs, tokens)
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
  };
}

export class CodeRunnerService {
  private tempDir: string;

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

  public async execute(req: CodeExecutionRequest): Promise<CodeExecutionResponse> {
    const lang = (req.language || 'plaintext').toLowerCase();
    const id = 'run_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const safeEnv = getSafeEnvironment();

    let res: CodeExecutionResponse;
    switch (lang) {
      case 'cpp':
      case 'c++':
        res = await this.runCpp(id, req.code, req.input, safeEnv);
        break;

      case 'c':
        res = await this.runC(id, req.code, req.input, safeEnv);
        break;

      case 'python':
      case 'py':
        res = await this.runPython(id, req.code, req.input, safeEnv);
        break;

      case 'javascript':
      case 'js':
      case 'typescript':
      case 'ts':
        res = await this.runNode(id, req.code, req.input, safeEnv);
        break;

      case 'java':
        res = await this.runJava(id, req.code, req.input, safeEnv);
        break;

      default:
        return {
          stdout: '',
          stderr: `Language '${lang}' execution is not supported on this runner. Supported: cpp, c, python, javascript, typescript, java.`,
          exitCode: 1,
          executionTimeMs: 0,
        };
    }

    return {
      ...res,
      stdout: this.cleanOutput(res.stdout, id, req.filename),
      stderr: this.cleanOutput(res.stderr, id, req.filename),
      compilerError: res.compilerError ? this.cleanOutput(res.compilerError, id, req.filename) : undefined,
    };
  }

  // --- C++ Execution ---
  private async runCpp(
    id: string,
    code: string,
    input = '',
    env: NodeJS.ProcessEnv
  ): Promise<CodeExecutionResponse> {
    const srcFile = path.join(this.tempDir, `${id}.cpp`);
    const isWin = process.platform === 'win32';
    const binFile = path.join(this.tempDir, isWin ? `${id}.exe` : `${id}.out`);

    fs.writeFileSync(srcFile, code, 'utf-8');

    const startTime = Date.now();

    try {
      // 1. Compile with g++ (with 8-second compile timeout)
      const compileCmd = `g++ -O2 -std=c++17 -Wall "${srcFile}" -o "${binFile}"`;
      const compileResult = await new Promise<{ error: Error | null; stderr: string }>((resolve) => {
        exec(compileCmd, { timeout: 8000, maxBuffer: 512 * 1024, env }, (error, _stdout, stderr) => {
          resolve({ error, stderr });
        });
      });

      if (compileResult.error || !fs.existsSync(binFile)) {
        return {
          stdout: '',
          stderr: compileResult.stderr || (compileResult.error ? compileResult.error.message : 'Compilation failed.'),
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
          compilerError: compileResult.stderr,
        };
      }

      // 2. Execute compiled binary (with 5-second runtime limit to prevent infinite loops)
      const runResult = await this.spawnProcess(binFile, [], input, env, 5000);
      return {
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      // Cleanup files immediately
      this.safeDelete(srcFile);
      this.safeDelete(binFile);
    }
  }

  // --- C Execution ---
  private async runC(
    id: string,
    code: string,
    input = '',
    env: NodeJS.ProcessEnv
  ): Promise<CodeExecutionResponse> {
    const srcFile = path.join(this.tempDir, `${id}.c`);
    const isWin = process.platform === 'win32';
    const binFile = path.join(this.tempDir, isWin ? `${id}.exe` : `${id}.out`);

    fs.writeFileSync(srcFile, code, 'utf-8');
    const startTime = Date.now();

    try {
      const compileCmd = `gcc -O2 -Wall "${srcFile}" -o "${binFile}"`;
      const compileResult = await new Promise<{ error: Error | null; stderr: string }>((resolve) => {
        exec(compileCmd, { timeout: 8000, maxBuffer: 512 * 1024, env }, (error, _stdout, stderr) => {
          resolve({ error, stderr });
        });
      });

      if (compileResult.error || !fs.existsSync(binFile)) {
        return {
          stdout: '',
          stderr: compileResult.stderr || 'Compilation failed.',
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
        };
      }

      const runResult = await this.spawnProcess(binFile, [], input, env, 5000);
      return {
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      this.safeDelete(srcFile);
      this.safeDelete(binFile);
    }
  }

  // --- Python Execution ---
  private async runPython(
    id: string,
    code: string,
    input = '',
    env: NodeJS.ProcessEnv
  ): Promise<CodeExecutionResponse> {
    const pyFile = path.join(this.tempDir, `${id}.py`);
    fs.writeFileSync(pyFile, code, 'utf-8');
    const startTime = Date.now();

    try {
      const isWin = process.platform === 'win32';
      const pyCmd = isWin ? 'python' : 'python3';
      const runResult = await this.spawnProcess(pyCmd, ['-u', pyFile], input, env, 5000);
      return {
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      this.safeDelete(pyFile);
    }
  }

  // --- Node.js Execution ---
  private async runNode(
    id: string,
    code: string,
    input = '',
    env: NodeJS.ProcessEnv
  ): Promise<CodeExecutionResponse> {
    const jsFile = path.join(this.tempDir, `${id}.js`);
    fs.writeFileSync(jsFile, code, 'utf-8');
    const startTime = Date.now();

    try {
      const runResult = await this.spawnProcess('node', [jsFile], input, env, 5000);
      return {
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      this.safeDelete(jsFile);
    }
  }

  // --- Java Execution ---
  private async runJava(
    id: string,
    code: string,
    input = '',
    env: NodeJS.ProcessEnv
  ): Promise<CodeExecutionResponse> {
    // Determine class name from code or default to Main
    const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
    const className = match ? match[1] : 'Main';

    const javaDir = path.join(this.tempDir, id);
    fs.mkdirSync(javaDir, { recursive: true });
    const javaFile = path.join(javaDir, `${className}.java`);
    fs.writeFileSync(javaFile, code, 'utf-8');
    const startTime = Date.now();

    try {
      const compileCmd = `javac "${javaFile}"`;
      const compileResult = await new Promise<{ error: Error | null; stderr: string }>((resolve) => {
        exec(compileCmd, { cwd: javaDir, timeout: 8000, env }, (error, _stdout, stderr) => {
          resolve({ error, stderr });
        });
      });

      if (compileResult.error) {
        return {
          stdout: '',
          stderr: compileResult.stderr || 'Java compilation failed.',
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
        };
      }

      const runResult = await this.spawnProcess('java', [className], input, env, 5000, javaDir);
      return {
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      try {
        fs.rmSync(javaDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup error
      }
    }
  }

  // Helper: Spawns process with timeout and input piping
  private spawnProcess(
    command: string,
    args: string[],
    input: string,
    env: NodeJS.ProcessEnv,
    timeoutMs = 5000,
    cwd = this.tempDir
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      const child = spawn(command, args, {
        cwd,
        env,
      });

      const timer = setTimeout(() => {
        isTimedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      if (input && child.stdin) {
        child.stdin.write(input);
        child.stdin.end();
      }

      child.stdout?.on('data', (data) => {
        if (stdout.length < 512 * 1024) {
          stdout += data.toString();
        }
      });

      child.stderr?.on('data', (data) => {
        if (stderr.length < 512 * 1024) {
          stderr += data.toString();
        }
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (isTimedOut) {
          resolve({
            stdout,
            stderr: stderr + `\n[Time Limit Exceeded]: Process terminated after ${timeoutMs / 1000}s.`,
            exitCode: 124,
          });
        } else {
          resolve({
            stdout,
            stderr,
            exitCode: code !== null ? code : 0,
          });
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: `Execution error: ${err.message}`,
          exitCode: 1,
        });
      });
    });
  }

  private safeDelete(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore cleanup error
    }
  }
}

export const codeRunnerService = new CodeRunnerService();
