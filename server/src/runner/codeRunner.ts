import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, execSync, spawn } from 'child_process';

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
      case 'mjs':
      case 'cjs':
        res = await this.runNode(id, req.code, req.input, safeEnv, false);
        break;

      case 'typescript':
      case 'ts':
      case 'tsx':
        res = await this.runNode(id, req.code, req.input, safeEnv, true);
        break;

      case 'java':
        res = await this.runJava(id, req.code, req.input, safeEnv);
        break;

      case 'rust':
      case 'rs':
        res = await this.runRust(id, req.code, req.input, safeEnv);
        break;

      case 'go':
      case 'golang':
        res = await this.runGo(id, req.code, req.input, safeEnv);
        break;

      case 'php':
        res = await this.runPhp(id, req.code, req.input, safeEnv);
        break;

      case 'ruby':
      case 'rb':
        res = await this.runRuby(id, req.code, req.input, safeEnv);
        break;

      case 'shell':
      case 'bash':
      case 'sh':
        res = await this.runBash(id, req.code, req.input, safeEnv);
        break;

      default:
        return {
          stdout: '',
          stderr: `Language '${lang}' execution is not supported on this runner. Supported: cpp, c, python, javascript, typescript, java, rust, go, php, ruby, shell.`,
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

      // 2. Execute compiled binary (with 10-second runtime limit to prevent infinite loops)
      const runResult = await this.spawnProcess(binFile, [], input, env, 10000);
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

      const runResult = await this.spawnProcess(binFile, [], input, env, 10000);
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
      const runResult = await this.spawnProcess(pyCmd, ['-u', pyFile], input, env, 10000);
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

  // --- Node.js & TypeScript Execution ---
  private async runNode(
    id: string,
    code: string,
    input = '',
    env: NodeJS.ProcessEnv,
    isTypeScript = false
  ): Promise<CodeExecutionResponse> {
    const ext = isTypeScript ? '.ts' : '.js';
    const srcFile = path.join(this.tempDir, `${id}${ext}`);
    fs.writeFileSync(srcFile, code, 'utf-8');
    const startTime = Date.now();

    try {
      const args = isTypeScript ? ['--experimental-strip-types', srcFile] : [srcFile];
      const runResult = await this.spawnProcess('node', args, input, env, 10000);
      return {
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      this.safeDelete(srcFile);
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

      const runResult = await this.spawnProcess('java', [className], input, env, 10000, javaDir);
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

  // --- Rust Execution ---
  private async runRust(
    id: string,
    code: string,
    input = '',
    env: NodeJS.ProcessEnv
  ): Promise<CodeExecutionResponse> {
    const isWin = process.platform === 'win32';
    const srcFile = path.join(this.tempDir, `${id}.rs`);
    const binFile = path.join(this.tempDir, isWin ? `${id}.exe` : `${id}.out`);
    fs.writeFileSync(srcFile, code, 'utf-8');
    const startTime = Date.now();

    try {
      const compileCmd = `rustc -O "${srcFile}" -o "${binFile}"`;
      const compileResult = await new Promise<{ error: Error | null; stderr: string }>((resolve) => {
        exec(compileCmd, { timeout: 12000, env }, (error, _stdout, stderr) => {
          resolve({ error, stderr });
        });
      });

      if (compileResult.error || !fs.existsSync(binFile)) {
        return {
          stdout: '',
          stderr: compileResult.stderr || 'Rust compilation failed.',
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
        };
      }

      const runResult = await this.spawnProcess(binFile, [], input, env, 10000);
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

  // --- Go Execution ---
  private async runGo(
    id: string,
    code: string,
    input = '',
    env: NodeJS.ProcessEnv
  ): Promise<CodeExecutionResponse> {
    const srcFile = path.join(this.tempDir, `${id}.go`);
    fs.writeFileSync(srcFile, code, 'utf-8');
    const startTime = Date.now();

    try {
      const runResult = await this.spawnProcess('go', ['run', srcFile], input, env, 10000);
      return {
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      this.safeDelete(srcFile);
    }
  }

  // --- PHP Execution ---
  private async runPhp(
    id: string,
    code: string,
    input = '',
    env: NodeJS.ProcessEnv
  ): Promise<CodeExecutionResponse> {
    const srcFile = path.join(this.tempDir, `${id}.php`);
    fs.writeFileSync(srcFile, code, 'utf-8');
    const startTime = Date.now();

    try {
      const runResult = await this.spawnProcess('php', [srcFile], input, env, 10000);
      return {
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      this.safeDelete(srcFile);
    }
  }

  // --- Ruby Execution ---
  private async runRuby(
    id: string,
    code: string,
    input = '',
    env: NodeJS.ProcessEnv
  ): Promise<CodeExecutionResponse> {
    const srcFile = path.join(this.tempDir, `${id}.rb`);
    fs.writeFileSync(srcFile, code, 'utf-8');
    const startTime = Date.now();

    try {
      const runResult = await this.spawnProcess('ruby', [srcFile], input, env, 10000);
      return {
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      this.safeDelete(srcFile);
    }
  }

  // --- Bash Execution ---
  private async runBash(
    id: string,
    code: string,
    input = '',
    env: NodeJS.ProcessEnv
  ): Promise<CodeExecutionResponse> {
    const srcFile = path.join(this.tempDir, `${id}.sh`);
    fs.writeFileSync(srcFile, code, 'utf-8');
    const startTime = Date.now();
    const shCmd = process.platform === 'win32' ? 'bash' : 'sh';

    try {
      const runResult = await this.spawnProcess(shCmd, [srcFile], input, env, 10000);
      return {
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      this.safeDelete(srcFile);
    }
  }

  // Helper: Spawns process with timeout and input piping
  private spawnProcess(
    command: string,
    args: string[],
    input: string,
    env: NodeJS.ProcessEnv,
    timeoutMs = 10000,
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
        if (process.platform === 'win32' && child.pid) {
          exec(`taskkill /pid ${child.pid} /T /F`, () => {});
        } else {
          child.kill('SIGKILL');
        }
      }, timeoutMs);

      // Always pipe input (if any) and immediately close stdin with EOF so cin/scanf/input() don't hang
      if (child.stdin) {
        if (input) {
          child.stdin.write(input);
        }
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
            stderr: (stderr ? stderr + '\n' : '') + `[Time Limit Exceeded]: Process terminated after ${timeoutMs / 1000}s.\nTip: If your program expects inputs (e.g. cin, scanf, input()), enter them into the "Custom Input (stdin)" tab before clicking Run.`,
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

      child.on('error', (err: any) => {
        clearTimeout(timer);
        const isNotFound = err.code === 'ENOENT' || err.message?.includes('ENOENT');
        const msg = isNotFound
          ? `[Runner Error]: '${command}' runtime/compiler is not installed on this server.\nPlease install '${command}' on your system or run Kollab inside its pre-configured Docker container where all compilers (C++, Java, Go, Rust, Python, Node, PHP, Ruby) are bundled.`
          : `Execution error: ${err.message}`;
        resolve({
          stdout,
          stderr: msg,
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
