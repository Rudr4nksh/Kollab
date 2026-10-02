import type { FileNode } from '../types/index.ts';

export interface GitCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  parentSha: string | null;
  snapshot: FileNode[];
  branch: string;
}

export interface StagedFile {
  path: string;
  status: 'A' | 'M' | 'D';
  content?: string;
}

export interface GitStatusResult {
  branch: string;
  staged: StagedFile[];
  unstaged: { path: string; status: 'M' | 'D' }[];
  untracked: string[];
}

// Simple line-by-line diff generator
export function generateUnifiedDiff(filePath: string, oldContent: string, newContent: string): string[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const diffLines: string[] = [
    `diff --git a${filePath} b${filePath}`,
    `--- a${filePath}`,
    `+++ b${filePath}`,
  ];

  let hasDiff = false;
  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diffLines.push(` ${oldLines[i]}`);
      i++;
      j++;
    } else {
      hasDiff = true;
      if (i < oldLines.length && (j >= newLines.length || !newLines.slice(j).includes(oldLines[i]))) {
        diffLines.push(`-${oldLines[i]}`);
        i++;
      } else if (j < newLines.length) {
        diffLines.push(`+${newLines[j]}`);
        j++;
      }
    }
  }

  return hasDiff ? diffLines : [];
}

export class GitService {
  private isInitialized = true;
  private currentBranch = 'main';
  private branches = new Map<string, string | null>(); // branch -> headCommitSha
  private commits = new Map<string, GitCommit>(); // sha -> commit
  private staged = new Map<string, StagedFile>(); // path -> StagedFile
  private remotes = new Map<string, string>(); // remoteName -> url
  private headCommitSha: string | null = null;

  constructor() {
    this.branches.set('main', null);
  }

  // Generate SHA-1 like hash
  private generateSha(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 40; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  // Deep clone files tree
  private cloneTree(nodes: FileNode[]): FileNode[] {
    return nodes.map((n) => ({
      ...n,
      children: n.children ? this.cloneTree(n.children) : undefined,
    }));
  }

  // Flatten all files into map: path -> content
  private flattenFiles(nodes: FileNode[]): Map<string, string> {
    const map = new Map<string, string>();
    const walk = (items: FileNode[]) => {
      items.forEach((n) => {
        if (n.type === 'file') {
          map.set(n.path, n.content || '');
        }
        if (n.children) walk(n.children);
      });
    };
    walk(nodes);
    return map;
  }

  // Initialize repository
  public isInit(): boolean {
    return this.isInitialized;
  }

  public init(initialFiles: FileNode[], author: string): string {
    this.isInitialized = true;
    this.currentBranch = 'main';
    this.branches.clear();
    this.commits.clear();
    this.staged.clear();
    this.remotes.clear();

    const sha = this.generateSha();
    const shortSha = sha.substring(0, 7);
    const initialCommit: GitCommit = {
      sha,
      shortSha,
      message: 'Initial commit',
      author,
      email: `${author.toLowerCase().replace(/\s+/g, '')}@kollab.dev`,
      timestamp: Date.now(),
      parentSha: null,
      snapshot: this.cloneTree(initialFiles),
      branch: 'main',
    };

    this.commits.set(sha, initialCommit);
    this.branches.set('main', sha);
    this.headCommitSha = sha;

    return `Initialized empty Git repository in /workspace/.git/`;
  }

  public getBranch(): string {
    return this.currentBranch;
  }

  public getHeadCommit(): GitCommit | null {
    if (!this.headCommitSha) return null;
    return this.commits.get(this.headCommitSha) || null;
  }

  // Get status of working tree compared to HEAD
  public getStatus(currentFiles: FileNode[]): GitStatusResult {
    const headCommit = this.getHeadCommit();
    const headFiles = headCommit ? this.flattenFiles(headCommit.snapshot) : new Map<string, string>();
    const workFiles = this.flattenFiles(currentFiles);

    const stagedList = Array.from(this.staged.values());
    const unstagedList: { path: string; status: 'M' | 'D' }[] = [];
    const untrackedList: string[] = [];

    // Check working files against HEAD and staged
    workFiles.forEach((content, path) => {
      const isStaged = this.staged.has(path);
      const inHead = headFiles.has(path);

      if (!inHead && !isStaged) {
        untrackedList.push(path);
      } else if (inHead) {
        const headContent = headFiles.get(path);
        if (content !== headContent && !isStaged) {
          unstagedList.push({ path, status: 'M' });
        }
      }
    });

    // Check for deleted files
    headFiles.forEach((_, path) => {
      if (!workFiles.has(path) && !this.staged.has(path)) {
        unstagedList.push({ path, status: 'D' });
      }
    });

    return {
      branch: this.currentBranch,
      staged: stagedList,
      unstaged: unstagedList,
      untracked: untrackedList,
    };
  }

  // Stage file(s)
  public add(target: string, currentFiles: FileNode[]): string {
    const headCommit = this.getHeadCommit();
    const headFiles = headCommit ? this.flattenFiles(headCommit.snapshot) : new Map<string, string>();
    const workFiles = this.flattenFiles(currentFiles);

    if (target === '.' || target === '-A' || target === '--all') {
      let count = 0;
      // Stage added & modified
      workFiles.forEach((content, path) => {
        const inHead = headFiles.has(path);
        if (!inHead) {
          this.staged.set(path, { path, status: 'A', content });
          count++;
        } else if (headFiles.get(path) !== content) {
          this.staged.set(path, { path, status: 'M', content });
          count++;
        }
      });
      // Stage deleted
      headFiles.forEach((_, path) => {
        if (!workFiles.has(path)) {
          this.staged.set(path, { path, status: 'D' });
          count++;
        }
      });
      return count > 0 ? `Staged ${count} change(s)` : 'Nothing to add';
    }

    const cleanPath = target.startsWith('/') ? target : `/${target}`;
    if (workFiles.has(cleanPath)) {
      const content = workFiles.get(cleanPath)!;
      const inHead = headFiles.has(cleanPath);
      this.staged.set(cleanPath, {
        path: cleanPath,
        status: inHead ? 'M' : 'A',
        content,
      });
      return `Staged ${cleanPath}`;
    } else if (headFiles.has(cleanPath)) {
      this.staged.set(cleanPath, { path: cleanPath, status: 'D' });
      return `Staged deletion of ${cleanPath}`;
    }

    return `fatal: pathspec '${target}' did not match any files`;
  }

  // Unstage file(s)
  public reset(target?: string): string {
    if (!target || target === 'HEAD' || target === '.') {
      const count = this.staged.size;
      this.staged.clear();
      return count > 0 ? `Unstaged ${count} file(s)` : 'No changes staged';
    }
    const cleanPath = target.startsWith('/') ? target : `/${target}`;
    if (this.staged.has(cleanPath)) {
      this.staged.delete(cleanPath);
      return `Unstaged ${cleanPath}`;
    }
    return `No staged changes for ${target}`;
  }

  // Create a commit
  public commit(message: string, currentFiles: FileNode[], author: string): { success: boolean; output: string } {
    if (this.staged.size === 0) {
      // Check if working tree has changes
      const status = this.getStatus(currentFiles);
      if (status.unstaged.length === 0 && status.untracked.length === 0) {
        return {
          success: false,
          output: `On branch ${this.currentBranch}\nnothing to commit, working tree clean`,
        };
      }
      return {
        success: false,
        output: `no changes added to commit (use "git add")`,
      };
    }

    const sha = this.generateSha();
    const shortSha = sha.substring(0, 7);
    const parentSha = this.headCommitSha;

    const newCommit: GitCommit = {
      sha,
      shortSha,
      message: message.trim(),
      author,
      email: `${author.toLowerCase().replace(/\s+/g, '')}@kollab.dev`,
      timestamp: Date.now(),
      parentSha,
      snapshot: this.cloneTree(currentFiles),
      branch: this.currentBranch,
    };

    this.commits.set(sha, newCommit);
    this.branches.set(this.currentBranch, sha);
    this.headCommitSha = sha;
    const changedCount = this.staged.size;
    this.staged.clear();

    return {
      success: true,
      output: `[${this.currentBranch} ${shortSha}] ${message}\n ${changedCount} file(s) changed`,
    };
  }

  // List branches
  public listBranches(): string[] {
    const list: string[] = [];
    this.branches.forEach((_, name) => {
      if (name === this.currentBranch) {
        list.push(`* \x1b[32m${name}\x1b[0m`);
      } else {
        list.push(`  ${name}`);
      }
    });
    return list;
  }

  // Create branch
  public createBranch(branchName: string): string {
    const clean = branchName.trim();
    if (!clean || clean.includes(' ')) {
      return `fatal: '${branchName}' is not a valid branch name.`;
    }
    if (this.branches.has(clean)) {
      return `fatal: A branch named '${clean}' already exists.`;
    }
    this.branches.set(clean, this.headCommitSha);
    return `Created branch ${clean}`;
  }

  // Delete branch
  public deleteBranch(branchName: string): string {
    const clean = branchName.trim();
    if (clean === this.currentBranch) {
      return `error: Cannot delete branch '${clean}' checked out at current HEAD`;
    }
    if (!this.branches.has(clean)) {
      return `error: branch '${clean}' not found.`;
    }
    this.branches.delete(clean);
    return `Deleted branch ${clean}`;
  }

  // Switch/Checkout branch
  public checkoutBranch(branchName: string): { success: boolean; output: string; files?: FileNode[] } {
    const clean = branchName.trim();
    if (clean === this.currentBranch) {
      return { success: true, output: `Already on '${clean}'` };
    }
    if (!this.branches.has(clean)) {
      return { success: false, output: `error: pathspec '${clean}' did not match any file(s) known to git` };
    }

    this.currentBranch = clean;
    this.headCommitSha = this.branches.get(clean) || null;
    this.staged.clear();

    const commit = this.getHeadCommit();
    const files = commit ? this.cloneTree(commit.snapshot) : undefined;

    return {
      success: true,
      output: `Switched to branch '${clean}'`,
      files,
    };
  }

  // Checkout new branch (-b)
  public checkoutNewBranch(branchName: string): string {
    const clean = branchName.trim();
    if (this.branches.has(clean)) {
      return `fatal: A branch named '${clean}' already exists.`;
    }
    this.branches.set(clean, this.headCommitSha);
    this.currentBranch = clean;
    return `Switched to a new branch '${clean}'`;
  }

  // Get commit logs
  public getLog(oneline = false, limit = 20): string[] {
    const lines: string[] = [];
    let currentSha = this.headCommitSha;
    let count = 0;

    while (currentSha && count < limit) {
      const c = this.commits.get(currentSha);
      if (!c) break;

      if (oneline) {
        const isHead = currentSha === this.headCommitSha;
        const headTag = isHead ? ` \x1b[36m(HEAD -> ${this.currentBranch})\x1b[0m` : '';
        lines.push(`\x1b[33m${c.shortSha}\x1b[0m${headTag} ${c.message}`);
      } else {
        const isHead = currentSha === this.headCommitSha;
        const headTag = isHead ? ` \x1b[36m(HEAD -> ${this.currentBranch})\x1b[0m` : '';
        lines.push(`\x1b[33mcommit ${c.sha}\x1b[0m${headTag}`);
        lines.push(`Author: ${c.author} <${c.email}>`);
        lines.push(`Date:   ${new Date(c.timestamp).toUTCString()}`);
        lines.push('');
        lines.push(`    ${c.message}`);
        lines.push('');
      }

      currentSha = c.parentSha;
      count++;
    }

    if (lines.length === 0) {
      lines.push('fatal: your current branch does not have any commits yet');
    }

    return lines;
  }

  // Diff of modified files vs HEAD
  public getDiff(targetFile: string | undefined, currentFiles: FileNode[]): string[] {
    const headCommit = this.getHeadCommit();
    const headFiles = headCommit ? this.flattenFiles(headCommit.snapshot) : new Map<string, string>();
    const workFiles = this.flattenFiles(currentFiles);

    const output: string[] = [];

    workFiles.forEach((newContent, path) => {
      if (targetFile && !path.endsWith(targetFile)) return;
      if (headFiles.has(path)) {
        const oldContent = headFiles.get(path)!;
        if (oldContent !== newContent) {
          const diff = generateUnifiedDiff(path, oldContent, newContent);
          output.push(...diff);
        }
      }
    });

    return output.length > 0 ? output : ['No diff against HEAD.'];
  }

  // Remotes
  public setRemote(name: string, url: string): string {
    this.remotes.set(name, url);
    return `Remote '${name}' set to ${url}`;
  }

  public getRemotes(): string[] {
    const list: string[] = [];
    this.remotes.forEach((url, name) => {
      list.push(`${name}\t${url} (fetch)`);
      list.push(`${name}\t${url} (push)`);
    });
    return list.length > 0 ? list : ['No remotes configured.'];
  }

  // Push simulation
  public push(remote = 'origin', branch?: string): string[] {
    const targetBranch = branch || this.currentBranch;
    const remoteUrl = this.remotes.get(remote) || `https://github.com/collaborator/${this.currentBranch}.git`;
    const commit = this.getHeadCommit();
    const shortSha = commit ? commit.shortSha : '0000000';

    return [
      `Enumerating objects: ${this.commits.size * 3}, done.`,
      `Counting objects: 100% (${this.commits.size * 3}/${this.commits.size * 3}), done.`,
      `Compressing objects: 100% (done).`,
      `Writing objects: 100% (${this.commits.size * 3}/${this.commits.size * 3}), done.`,
      `Total ${this.commits.size * 3} (delta 0), reused 0 (delta 0)`,
      `To ${remoteUrl}`,
      ` * [new branch]      ${targetBranch} -> ${targetBranch} (${shortSha})`,
      `Branch '${targetBranch}' set up to track remote branch '${targetBranch}' from '${remote}'.`,
    ];
  }

  // Clone public GitHub repository into workspace FileNode[]
  public async cloneGitHub(repoUrl: string): Promise<{ success: boolean; files?: FileNode[]; message: string }> {
    try {
      // Parse https://github.com/{owner}/{repo}
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/i);
      if (!match) {
        return {
          success: false,
          message: `fatal: repository '${repoUrl}' does not exist or invalid GitHub URL format. Use https://github.com/owner/repo`,
        };
      }

      const [, owner, repo] = match;

      // 1. Fetch repo info (default branch)
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (!repoRes.ok) {
        return {
          success: false,
          message: `fatal: could not access GitHub repository ${owner}/${repo} (${repoRes.statusText})`,
        };
      }
      const repoData = await repoRes.json();
      const defaultBranch = repoData.default_branch || 'main';

      // 2. Fetch git tree recursively
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
      );
      if (!treeRes.ok) {
        return {
          success: false,
          message: `fatal: failed to fetch repository file tree from GitHub (${treeRes.statusText})`,
        };
      }
      const treeData = await treeRes.json();
      const treeItems: any[] = (treeData.tree || []).slice(0, 50); // limit to first 50 files for speed

      // Build file tree
      const newFiles: FileNode[] = [];

      for (const item of treeItems) {
        if (item.type === 'blob') {
          // Fetch raw file content
          let content = '';
          try {
            const rawRes = await fetch(
              `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${item.path}`
            );
            if (rawRes.ok) {
              content = await rawRes.text();
            }
          } catch {
            content = '// Could not load raw file content';
          }

          const pathParts = item.path.split('/');
          const fileName = pathParts.pop();

          // Simple insertion into file tree
          newFiles.push({
            id: 'git_' + Math.random().toString(36).substring(2, 9),
            name: fileName,
            path: `/${item.path}`,
            type: 'file',
            content,
          });
        }
      }

      // Initialize git with the cloned repo
      this.init(newFiles, owner);
      this.setRemote('origin', `https://github.com/${owner}/${repo}.git`);

      return {
        success: true,
        files: newFiles,
        message: `Cloning into '${repo}'...\nremote: Enumerating objects: ${treeItems.length}, done.\nremote: Total ${treeItems.length} (delta 0), reused 0 (delta 0)\nReceiving objects: 100% (${treeItems.length}/${treeItems.length}), done.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `fatal: git clone failed: ${err.message}`,
      };
    }
  }
}

export const gitService = new GitService();
