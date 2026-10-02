import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import type { FileNode } from '../types/index.js';

export interface TerminalExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  branch: string;
  updatedFiles?: FileNode[];
}

export class TerminalService {
  private baseWorkspaceDir: string;

  constructor() {
    this.baseWorkspaceDir = path.resolve(process.cwd(), 'workspaces');
    if (!fs.existsSync(this.baseWorkspaceDir)) {
      fs.mkdirSync(this.baseWorkspaceDir, { recursive: true });
    }
  }

  // Get or create room workspace path
  public getRoomWorkspaceDir(roomId: string): string {
    const cleanRoom = (roomId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
    const roomDir = path.join(this.baseWorkspaceDir, cleanRoom);
    if (!fs.existsSync(roomDir)) {
      fs.mkdirSync(roomDir, { recursive: true });
    }
    return roomDir;
  }

  // Sync memory files to disk
  public syncFilesToDisk(roomDir: string, files: FileNode[]): void {
    const writeNode = (node: FileNode, parentDir: string) => {
      const targetPath = path.join(parentDir, node.name);
      if (node.type === 'folder') {
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }
        if (node.children) {
          node.children.forEach((child) => writeNode(child, targetPath));
        }
      } else {
        const fileDir = path.dirname(targetPath);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        fs.writeFileSync(targetPath, node.content || '', 'utf-8');
      }
    };

    files.forEach((file) => writeNode(file, roomDir));
  }

  // Read disk files back into FileNode[] tree
  public scanDiskFiles(roomDir: string, currentRelative = ''): FileNode[] {
    const currentDir = path.join(roomDir, currentRelative);
    if (!fs.existsSync(currentDir)) return [];

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.DS_Store') {
        continue;
      }

      const relPath = currentRelative ? `/${currentRelative}/${entry.name}` : `/${entry.name}`;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        nodes.push({
          id: 'dir_' + Buffer.from(relPath).toString('base64').substring(0, 10),
          name: entry.name,
          path: relPath,
          type: 'folder',
          children: this.scanDiskFiles(roomDir, currentRelative ? `${currentRelative}/${entry.name}` : entry.name),
        });
      } else if (entry.isFile()) {
        let content = '';
        try {
          content = fs.readFileSync(fullPath, 'utf-8');
        } catch {
          content = '';
        }

        nodes.push({
          id: 'file_' + Buffer.from(relPath).toString('base64').substring(0, 10),
          name: entry.name,
          path: relPath,
          type: 'file',
          content,
        });
      }
    }

    return nodes;
  }

  // Get current git branch on disk
  public async getGitBranch(roomDir: string): Promise<string> {
    return new Promise((resolve) => {
      exec('git rev-parse --abbrev-ref HEAD', { cwd: roomDir }, (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve('main');
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  // Execute terminal command on the host OS
  public async executeCommand(
    roomId: string,
    command: string,
    files?: FileNode[],
    clientCwd?: string
  ): Promise<TerminalExecutionResult> {
    const roomDir = this.getRoomWorkspaceDir(roomId);

    // 1. Sync memory files to disk if provided
    if (files && files.length > 0) {
      this.syncFilesToDisk(roomDir, files);
    }

    // 2. Initialize git if not already initialized
    const gitDir = path.join(roomDir, '.git');
    if (!fs.existsSync(gitDir)) {
      await new Promise((resolve) => {
        exec('git init -b main', { cwd: roomDir }, () => resolve(true));
      });
    }

    // 3. Determine execution directory
    let execDir = roomDir;
    if (clientCwd && clientCwd !== '/' && clientCwd !== '~') {
      const rel = clientCwd.replace(/^\/+/, '');
      const potential = path.join(roomDir, rel);
      if (fs.existsSync(potential) && fs.statSync(potential).isDirectory()) {
        execDir = potential;
      }
    }

    // 4. Run command in real shell
    return new Promise((resolve) => {
      const isWin = process.platform === 'win32';
      const shell = isWin ? 'powershell.exe' : '/bin/bash';

      exec(
        command,
        {
          cwd: execDir,
          shell,
          timeout: 45000,
          maxBuffer: 10 * 1024 * 1024, // 10MB
          env: {
            ...process.env,
            PAGER: 'cat',
            GIT_PAGER: 'cat',
          },
        },
        async (error, stdout, stderr) => {
          const branch = await this.getGitBranch(roomDir);
          const updatedFiles = this.scanDiskFiles(roomDir);

          resolve({
            stdout: stdout || '',
            stderr: stderr || (error && !stdout ? error.message : ''),
            exitCode: error?.code !== undefined ? error.code : 0,
            branch,
            updatedFiles,
          });
        }
      );
    });
  }
}

export const terminalService = new TerminalService();
