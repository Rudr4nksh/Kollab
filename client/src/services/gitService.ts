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

export interface GitHubUser {
  login: string;
  name?: string;
  avatar_url?: string;
  email?: string;
  html_url?: string;
}

// UTF-8 safe base64 decoder
function b64DecodeUnicode(str: string): string {
  try {
    const cleanStr = str.replace(/\s/g, '');
    const binary = atob(cleanStr);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return atob(str.replace(/\s/g, ''));
  }
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
  private config = new Map<string, string>();
  private githubToken: string | null = null;
  private githubUser: GitHubUser | null = null;

  constructor() {
    this.branches.set('main', null);

    // Load persisted GitHub token & user
    try {
      const savedToken = localStorage.getItem('kollab_github_token');
      if (savedToken) {
        this.githubToken = savedToken;
        this.config.set('github.token', savedToken);
      }

      const savedUser = localStorage.getItem('kollab_github_user');
      if (savedUser) {
        this.githubUser = JSON.parse(savedUser);
        if (this.githubUser?.name) this.config.set('user.name', this.githubUser.name);
        if (this.githubUser?.email) this.config.set('user.email', this.githubUser.email);
      }

      const savedRemote = localStorage.getItem('kollab_git_remote_origin');
      if (savedRemote) {
        this.remotes.set('origin', savedRemote);
      }
    } catch {
      // Storage unavailable or parsing error
    }
  }

  // --- Configuration Management ---
  public setConfig(key: string, value: string): void {
    const cleanKey = key.trim().toLowerCase();
    this.config.set(cleanKey, value.trim());

    if (cleanKey === 'github.token') {
      this.githubToken = value.trim();
      localStorage.setItem('kollab_github_token', this.githubToken);
    } else if (cleanKey === 'user.name') {
      localStorage.setItem('kollab_github_name', value.trim());
    } else if (cleanKey === 'user.email') {
      localStorage.setItem('kollab_github_email', value.trim());
    }
  }

  public getConfig(key: string): string | null {
    return this.config.get(key.trim().toLowerCase()) || null;
  }

  public getAllConfig(): [string, string][] {
    return Array.from(this.config.entries());
  }

  // --- GitHub Authentication & Token ---
  public async setGitHubToken(token: string): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    const cleanToken = token.trim().replace(/^["']|["']$/g, '');
    if (!cleanToken) {
      this.clearGitHubAuth();
      return { success: false, error: 'Token is empty.' };
    }

    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) {
        return {
          success: false,
          error: `GitHub authentication failed (HTTP ${res.status}: ${res.statusText}). Verify token permissions.`,
        };
      }

      const userData: GitHubUser = await res.json();
      this.githubToken = cleanToken;
      this.githubUser = userData;
      this.config.set('github.token', cleanToken);
      this.config.set('user.name', userData.name || userData.login);
      if (userData.email) this.config.set('user.email', userData.email);

      localStorage.setItem('kollab_github_token', cleanToken);
      localStorage.setItem('kollab_github_user', JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error verifying GitHub token.' };
    }
  }

  // --- 1-Click "Sign in with GitHub" OAuth Flow ---
  public async loginWithGitHub(): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
    return new Promise((resolve) => {
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        `${SERVER_URL}/api/auth/github/login`,
        'github_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        resolve({ success: false, error: 'Popup blocked by browser. Please allow popups for this site.' });
        return;
      }

      let resolved = false;

      const messageListener = (event: MessageEvent) => {
        if (event.data?.type === 'GITHUB_OAUTH_SUCCESS') {
          resolved = true;
          window.removeEventListener('message', messageListener);
          const { token, user } = event.data;
          this.githubToken = token;
          this.githubUser = user;
          this.config.set('github.token', token);
          this.config.set('user.name', user.name || user.login);
          if (user.email) this.config.set('user.email', user.email);

          localStorage.setItem('kollab_github_token', token);
          localStorage.setItem('kollab_github_user', JSON.stringify(user));

          resolve({ success: true, user });
        }
      };

      window.addEventListener('message', messageListener);

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          if (!resolved) {
            if (this.githubToken && this.githubUser) {
              resolve({ success: true, user: this.githubUser });
            } else {
              resolve({ success: false, error: 'Sign in cancelled.' });
            }
          }
        }
      }, 600);
    });
  }

  public getGitHubToken(): string | null {
    return this.githubToken;
  }

  public getGitHubUser(): GitHubUser | null {
    return this.githubUser;
  }

  public clearGitHubAuth(): void {
    this.githubToken = null;
    this.githubUser = null;
    this.config.delete('github.token');
    localStorage.removeItem('kollab_github_token');
    localStorage.removeItem('kollab_github_user');
  }

  // --- GitHub URL Parsing ---
  public parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    if (!url) return null;
    const clean = url.trim().replace(/\.git$/i, '');
    const match = clean.match(/github\.com[:/]([^/]+)\/([^/]+)$/i);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
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
  public flattenFiles(nodes: FileNode[]): Map<string, string> {
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

    const sha = this.generateSha();
    const initCommit: GitCommit = {
      sha,
      shortSha: sha.substring(0, 7),
      message: 'Initial commit',
      author: this.config.get('user.name') || author || 'Kollab Collaborator',
      email: this.config.get('user.email') || 'collaborator@kollab.dev',
      timestamp: Date.now(),
      parentSha: null,
      snapshot: this.cloneTree(initialFiles),
      branch: 'main',
    };

    this.commits.set(sha, initCommit);
    this.branches.set('main', sha);
    this.headCommitSha = sha;

    return `Initialized empty Git repository in /workspace/.git/`;
  }

  // Status check
  public getStatus(currentFiles: FileNode[]): GitStatusResult {
    const headCommit = this.getHeadCommit();
    const headMap = headCommit ? this.flattenFiles(headCommit.snapshot) : new Map<string, string>();
    const currentMap = this.flattenFiles(currentFiles);

    const staged: StagedFile[] = Array.from(this.staged.values());
    const unstaged: { path: string; status: 'M' | 'D' }[] = [];
    const untracked: string[] = [];

    // Check unstaged changes and untracked files
    currentMap.forEach((content, path) => {
      if (this.staged.has(path)) return; // Already staged

      if (headMap.has(path)) {
        if (headMap.get(path) !== content) {
          unstaged.push({ path, status: 'M' });
        }
      } else {
        untracked.push(path);
      }
    });

    // Check for deleted files
    headMap.forEach((_, path) => {
      if (!currentMap.has(path) && !this.staged.has(path)) {
        unstaged.push({ path, status: 'D' });
      }
    });

    return {
      branch: this.currentBranch,
      staged,
      unstaged,
      untracked,
    };
  }

  // Add files to staging
  public add(target: string, currentFiles: FileNode[]): string {
    const headCommit = this.getHeadCommit();
    const headMap = headCommit ? this.flattenFiles(headCommit.snapshot) : new Map<string, string>();
    const currentMap = this.flattenFiles(currentFiles);

    if (target === '.' || target === '-A' || target === '--all') {
      // Stage all changes
      currentMap.forEach((content, path) => {
        if (!headMap.has(path)) {
          this.staged.set(path, { path, status: 'A', content });
        } else if (headMap.get(path) !== content) {
          this.staged.set(path, { path, status: 'M', content });
        }
      });

      headMap.forEach((_, path) => {
        if (!currentMap.has(path)) {
          this.staged.set(path, { path, status: 'D' });
        }
      });

      return `Staged all modified and untracked files.`;
    }

    const normPath = target.startsWith('/') ? target : `/${target}`;
    if (currentMap.has(normPath)) {
      const content = currentMap.get(normPath);
      const status = headMap.has(normPath) ? 'M' : 'A';
      this.staged.set(normPath, { path: normPath, status, content });
      return `Staged '${normPath}'.`;
    } else if (headMap.has(normPath)) {
      this.staged.set(normPath, { path: normPath, status: 'D' });
      return `Staged deletion of '${normPath}'.`;
    } else {
      return `fatal: pathspec '${target}' did not match any files`;
    }
  }

  // Commit staged changes
  public commit(message: string, currentFiles: FileNode[], author: string): { success: boolean; output: string } {
    if (this.staged.size === 0) {
      return {
        success: false,
        output: 'nothing to commit, working tree clean',
      };
    }

    const sha = this.generateSha();
    const shortSha = sha.substring(0, 7);
    const newCommit: GitCommit = {
      sha,
      shortSha,
      message,
      author: this.config.get('user.name') || author || 'Kollab Collaborator',
      email: this.config.get('user.email') || 'collaborator@kollab.dev',
      timestamp: Date.now(),
      parentSha: this.headCommitSha,
      snapshot: this.cloneTree(currentFiles),
      branch: this.currentBranch,
    };

    this.commits.set(sha, newCommit);
    this.branches.set(this.currentBranch, sha);
    this.headCommitSha = sha;
    const fileCount = this.staged.size;
    this.staged.clear();

    return {
      success: true,
      output: `[${this.currentBranch} ${shortSha}] ${message}\n ${fileCount} file(s) changed, ${fileCount} insertion(s)(+)`,
    };
  }

  // Get commit logs
  public getLog(oneline = false): string[] {
    const list: string[] = [];
    let curSha = this.headCommitSha;

    while (curSha && this.commits.has(curSha)) {
      const c = this.commits.get(curSha)!;
      if (oneline) {
        list.push(`${c.shortSha} ${c.message}`);
      } else {
        list.push(
          `commit ${c.sha} (HEAD -> ${c.branch})\nAuthor: ${c.author} <${c.email}>\nDate:   ${new Date(c.timestamp).toUTCString()}\n\n    ${c.message}\n`
        );
      }
      curSha = c.parentSha;
    }

    return list.length > 0 ? list : ['fatal: your current branch does not have any commits yet'];
  }

  // Get unified diff for a file
  public getDiff(targetPath?: string, currentFiles: FileNode[] = []): string[] {
    const headCommit = this.getHeadCommit();
    const headMap = headCommit ? this.flattenFiles(headCommit.snapshot) : new Map<string, string>();
    const currentMap = this.flattenFiles(currentFiles);

    const allDiffs: string[] = [];
    const checkFile = (path: string) => {
      const oldC = headMap.get(path) || '';
      const newC = currentMap.get(path) || '';
      if (oldC !== newC) {
        allDiffs.push(...generateUnifiedDiff(path, oldC, newC));
      }
    };

    if (targetPath) {
      const norm = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
      checkFile(norm);
    } else {
      currentMap.forEach((_, p) => checkFile(p));
      headMap.forEach((_, p) => {
        if (!currentMap.has(p)) checkFile(p);
      });
    }

    return allDiffs.length > 0 ? allDiffs : ['No changes detected.'];
  }

  // Reset / Unstage
  public reset(path?: string): string {
    if (!path) {
      this.staged.clear();
      return 'Unstaged all changes.';
    }
    const norm = path.startsWith('/') ? path : `/${path}`;
    if (this.staged.has(norm)) {
      this.staged.delete(norm);
      return `Unstaged '${norm}'.`;
    }
    return `fatal: pathspec '${path}' did not match any files`;
  }

  // Branch management
  public getBranch(): string {
    return this.currentBranch;
  }

  public listBranches(): string[] {
    const list: string[] = [];
    this.branches.forEach((_, branch) => {
      if (branch === this.currentBranch) {
        list.push(`* \x1b[32m${branch}\x1b[0m`);
      } else {
        list.push(`  ${branch}`);
      }
    });
    return list;
  }

  public createBranch(branchName: string): string {
    if (!branchName) return `fatal: branch name required`;
    if (this.branches.has(branchName)) return `fatal: A branch named '${branchName}' already exists.`;
    this.branches.set(branchName, this.headCommitSha);
    return `Created branch '${branchName}'.`;
  }

  public checkoutBranch(branchName: string): { success: boolean; files?: FileNode[]; output: string } {
    if (!this.branches.has(branchName)) {
      return {
        success: false,
        output: `error: pathspec '${branchName}' did not match any file(s) known to git`,
      };
    }

    this.currentBranch = branchName;
    const targetSha = this.branches.get(branchName);
    this.headCommitSha = targetSha ?? null;

    let targetFiles: FileNode[] | undefined;
    if (targetSha && this.commits.has(targetSha)) {
      targetFiles = this.cloneTree(this.commits.get(targetSha)!.snapshot);
    }

    return {
      success: true,
      files: targetFiles,
      output: `Switched to branch '${branchName}'`,
    };
  }

  public checkoutNewBranch(branchName: string): string {
    if (!branchName) return `fatal: missing branch name for -b`;
    if (this.branches.has(branchName)) return `fatal: A branch named '${branchName}' already exists.`;
    this.branches.set(branchName, this.headCommitSha);
    this.currentBranch = branchName;
    return `Switched to a new branch '${branchName}'`;
  }

  public deleteBranch(branchName: string): string {
    if (branchName === this.currentBranch) return `error: Cannot delete the branch '${branchName}' which you are currently on.`;
    if (!this.branches.has(branchName)) return `error: branch '${branchName}' not found.`;
    this.branches.delete(branchName);
    return `Deleted branch ${branchName}.`;
  }

  public getHeadCommit(): GitCommit | null {
    if (!this.headCommitSha) return null;
    return this.commits.get(this.headCommitSha) || null;
  }

  // Remote repository management
  public setRemote(name: string, url: string): string {
    this.remotes.set(name, url);
    if (name === 'origin') {
      localStorage.setItem('kollab_git_remote_origin', url);
    }
    return `Remote '${name}' set to ${url}`;
  }

  public getRemote(name = 'origin'): string | null {
    return this.remotes.get(name) || null;
  }

  public removeRemote(name: string): string {
    if (this.remotes.has(name)) {
      this.remotes.delete(name);
      if (name === 'origin') localStorage.removeItem('kollab_git_remote_origin');
      return `Removed remote '${name}'.`;
    }
    return `error: No such remote: '${name}'`;
  }

  public getRemotes(): string[] {
    const list: string[] = [];
    this.remotes.forEach((url, name) => {
      list.push(`${name}\t${url} (fetch)`);
      list.push(`${name}\t${url} (push)`);
    });
    return list.length > 0 ? list : ['No remotes configured. Use: git remote add origin <github-url>'];
  }

  // --- REAL GITHUB OPERATIONS ---

  /**
   * Pushes current workspace snapshot to GitHub repository via Git Data API.
   * Creates blobs, a tree, a commit, and updates the branch ref on github.com.
   */
  public async pushGitHub(
    files: FileNode[],
    remote = 'origin',
    branch?: string,
    customMessage?: string
  ): Promise<{ success: boolean; lines: string[]; commitUrl?: string }> {
    const remoteUrl = this.getRemote(remote);
    if (!remoteUrl) {
      return {
        success: false,
        lines: [
          `fatal: No configured push destination for remote '${remote}'.`,
          `Set up your GitHub remote using:`,
          `  git remote add origin https://github.com/<owner>/<repo>.git`,
        ],
      };
    }

    const parsed = this.parseGitHubUrl(remoteUrl);
    if (!parsed) {
      return {
        success: false,
        lines: [
          `fatal: remote '${remote}' is not a valid GitHub repository URL: ${remoteUrl}`,
          `Example format: https://github.com/owner/repository.git`,
        ],
      };
    }

    const { owner, repo } = parsed;

    if (!this.githubToken) {
      return {
        success: false,
        lines: [
          `fatal: GitHub Personal Access Token is required to push to github.com.`,
          ``,
          `To authenticate in the terminal:`,
          `  git config github.token <YOUR_PERSONAL_ACCESS_TOKEN>`,
          `  or: gh auth login <YOUR_TOKEN>`,
          ``,
          `Or configure in Workspace Settings -> GitHub Integration (bottom left).`,
          `Create a token at: https://github.com/settings/tokens (select 'repo' scope).`,
        ],
      };
    }

    const targetBranch = branch || this.currentBranch || 'main';
    const authHeaders = {
      Authorization: `Bearer ${this.githubToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    try {
      // 1. Verify repository access & write permissions
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: authHeaders,
      });

      if (repoRes.status === 401) {
        return {
          success: false,
          lines: [
            `fatal: Authentication failed (HTTP 401 Bad credentials).`,
            `Please update your GitHub token using: git config github.token <token>`,
          ],
        };
      }

      if (repoRes.status === 404) {
        return {
          success: false,
          lines: [
            `fatal: Repository '${owner}/${repo}' does not exist on GitHub or your token lacks access.`,
            `Tip: Run 'gh repo create ${repo}' to create this repository on your GitHub account!`,
          ],
        };
      }

      if (!repoRes.ok) {
        return {
          success: false,
          lines: [`fatal: GitHub API error: ${repoRes.status} ${repoRes.statusText}`],
        };
      }

      // 2. Get head ref of target branch
      let parentCommitSha: string | null = null;
      let branchExists = false;

      const refRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`,
        { headers: authHeaders }
      );

      if (refRes.ok) {
        const refData = await refRes.json();
        parentCommitSha = refData.object.sha;
        branchExists = true;
      } else if (refRes.status === 404) {
        // Branch doesn't exist yet on GitHub; check if repository has default branch
        const repoData = await repoRes.json();
        if (repoData.default_branch && repoData.default_branch !== targetBranch) {
          const defaultRefRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${repoData.default_branch}`,
            { headers: authHeaders }
          );
          if (defaultRefRes.ok) {
            const defData = await defaultRefRes.json();
            parentCommitSha = defData.object.sha;
          }
        }
      }

      // 3. Prepare workspace files list
      const flatFiles: { path: string; content: string }[] = [];
      const extractFiles = (nodes: FileNode[]) => {
        for (const n of nodes) {
          if (n.type === 'file') {
            const cleanPath = n.path.replace(/^\/+/, '');
            flatFiles.push({ path: cleanPath, content: n.content || '' });
          }
          if (n.children) extractFiles(n.children);
        }
      };
      extractFiles(files);

      if (flatFiles.length === 0) {
        return {
          success: false,
          lines: ['fatal: Nothing to push. Workspace has no files.'],
        };
      }

      // 4. Create Tree with all files
      const treePayload = {
        tree: flatFiles.map((f) => ({
          path: f.path,
          mode: '100644',
          type: 'blob',
          content: f.content,
        })),
      };

      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(treePayload),
      });

      if (!treeRes.ok) {
        const errJson = await treeRes.json().catch(() => ({}));
        return {
          success: false,
          lines: [
            `fatal: Failed to create tree on GitHub (${treeRes.statusText})`,
            errJson.message ? `Details: ${errJson.message}` : '',
          ].filter(Boolean),
        };
      }

      const treeData = await treeRes.json();
      const treeSha = treeData.sha;

      // 5. Create Commit
      const headLocal = this.getHeadCommit();
      const commitMessage =
        customMessage ||
        headLocal?.message ||
        `Update workspace files via Kollab [${new Date().toLocaleTimeString()}]`;

      const authorName =
        this.config.get('user.name') ||
        this.githubUser?.name ||
        this.githubUser?.login ||
        'Kollab Collaborator';

      const authorEmail =
        this.config.get('user.email') ||
        this.githubUser?.email ||
        'collaborator@kollab.dev';

      const commitPayload = {
        message: commitMessage,
        tree: treeSha,
        parents: parentCommitSha ? [parentCommitSha] : [],
        author: {
          name: authorName,
          email: authorEmail,
          date: new Date().toISOString(),
        },
      };

      const commitRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/commits`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(commitPayload),
        }
      );

      if (!commitRes.ok) {
        const errJson = await commitRes.json().catch(() => ({}));
        return {
          success: false,
          lines: [
            `fatal: Failed to create commit on GitHub (${commitRes.statusText})`,
            errJson.message ? `Details: ${errJson.message}` : '',
          ].filter(Boolean),
        };
      }

      const commitData = await commitRes.json();
      const newCommitSha: string = commitData.sha;
      const commitHtmlUrl: string = commitData.html_url;

      // 6. Update or Create Branch Ref
      if (branchExists) {
        const updateRefRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`,
          {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ sha: newCommitSha, force: true }),
          }
        );

        if (!updateRefRes.ok) {
          const errJson = await updateRefRes.json().catch(() => ({}));
          return {
            success: false,
            lines: [
              `fatal: Failed to update branch reference on GitHub (${updateRefRes.statusText})`,
              errJson.message ? `Details: ${errJson.message}` : '',
            ].filter(Boolean),
          };
        }
      } else {
        const createRefRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/refs`,
          {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              ref: `refs/heads/${targetBranch}`,
              sha: newCommitSha,
            }),
          }
        );

        if (!createRefRes.ok) {
          const errJson = await createRefRes.json().catch(() => ({}));
          return {
            success: false,
            lines: [
              `fatal: Failed to create branch '${targetBranch}' on GitHub (${createRefRes.statusText})`,
              errJson.message ? `Details: ${errJson.message}` : '',
            ].filter(Boolean),
          };
        }
      }

      // Record commit locally
      const localCommit: GitCommit = {
        sha: newCommitSha,
        shortSha: newCommitSha.substring(0, 7),
        message: commitMessage,
        author: authorName,
        email: authorEmail,
        timestamp: Date.now(),
        parentSha: parentCommitSha,
        snapshot: this.cloneTree(files),
        branch: targetBranch,
      };

      this.commits.set(newCommitSha, localCommit);
      this.branches.set(targetBranch, newCommitSha);
      this.headCommitSha = newCommitSha;
      this.staged.clear();

      const shortOld = parentCommitSha ? parentCommitSha.substring(0, 7) : '0000000';
      const shortNew = newCommitSha.substring(0, 7);

      return {
        success: true,
        commitUrl: commitHtmlUrl,
        lines: [
          `Enumerating objects: ${flatFiles.length}, done.`,
          `Counting objects: 100% (${flatFiles.length}/${flatFiles.length}), done.`,
          `Compressing objects: 100% (done).`,
          `Writing objects: 100% (${flatFiles.length}/${flatFiles.length}), done.`,
          `Total ${flatFiles.length} (delta 0), reused 0 (delta 0)`,
          `To https://github.com/${owner}/${repo}.git`,
          `   ${shortOld}..${shortNew}  ${targetBranch} -> ${targetBranch}`,
          `✓ Successfully pushed to GitHub!`,
          `Commit on GitHub: ${commitHtmlUrl}`,
        ],
      };
    } catch (err: any) {
      return {
        success: false,
        lines: [`fatal: network error pushing to GitHub: ${err.message}`],
      };
    }
  }

  /**
   * Pulls files from GitHub repository and replaces workspace files.
   */
  public async pullGitHub(
    remote = 'origin',
    branch?: string
  ): Promise<{ success: boolean; files?: FileNode[]; lines: string[] }> {
    const remoteUrl = this.getRemote(remote);
    if (!remoteUrl) {
      return {
        success: false,
        lines: [`fatal: No configured pull source for remote '${remote}'.`],
      };
    }

    const parsed = this.parseGitHubUrl(remoteUrl);
    if (!parsed) {
      return {
        success: false,
        lines: [`fatal: Invalid GitHub repository URL: ${remoteUrl}`],
      };
    }

    const { owner, repo } = parsed;
    const targetBranch = branch || this.currentBranch || 'main';

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (this.githubToken) {
      headers['Authorization'] = `Bearer ${this.githubToken}`;
    }

    try {
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`,
        { headers }
      );

      if (!treeRes.ok) {
        return {
          success: false,
          lines: [`fatal: Failed to fetch repository files from branch '${targetBranch}' (${treeRes.statusText})`],
        };
      }

      const treeData = await treeRes.json();
      const treeItems: any[] = (treeData.tree || []).slice(0, 100);

      const newFiles: FileNode[] = [];

      for (const item of treeItems) {
        if (item.type === 'blob') {
          let content = '';
          try {
            // First attempt: GitHub Git Blobs API (supports private repos with token)
            const blobRes = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/git/blobs/${item.sha}`,
              { headers }
            );

            if (blobRes.ok) {
              const blobData = await blobRes.json();
              if (blobData.encoding === 'base64') {
                content = b64DecodeUnicode(blobData.content);
              } else {
                content = blobData.content || '';
              }
            } else {
              // Fallback to raw usercontent
              const rawRes = await fetch(
                `https://raw.githubusercontent.com/${owner}/${repo}/${targetBranch}/${item.path}`
              );
              if (rawRes.ok) content = await rawRes.text();
            }
          } catch {
            content = '// Could not load file content';
          }

          const pathParts = item.path.split('/');
          const fileName = pathParts.pop();

          newFiles.push({
            id: 'git_' + Math.random().toString(36).substring(2, 9),
            name: fileName,
            path: `/${item.path}`,
            type: 'file',
            content,
          });
        }
      }

      // Re-init git with pulled snapshot
      this.init(newFiles, owner);

      return {
        success: true,
        files: newFiles,
        lines: [
          `From https://github.com/${owner}/${repo}`,
          ` * branch            ${targetBranch}     -> FETCH_HEAD`,
          `✓ Successfully pulled ${newFiles.length} file(s) from GitHub into workspace.`,
        ],
      };
    } catch (err: any) {
      return {
        success: false,
        lines: [`fatal: network error pulling from GitHub: ${err.message}`],
      };
    }
  }

  /**
   * Creates a new repository on GitHub under the authenticated user's account.
   */
  public async createGitHubRepo(
    repoName: string,
    isPrivate = false
  ): Promise<{ success: boolean; repoUrl?: string; lines: string[] }> {
    if (!this.githubToken) {
      return {
        success: false,
        lines: [
          `fatal: GitHub Personal Access Token required to create repository.`,
          `Run: git config github.token <YOUR_TOKEN> or gh auth login <YOUR_TOKEN>`,
        ],
      };
    }

    try {
      const res = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          private: isPrivate,
          description: 'Created with Kollab Collaborative IDE',
          auto_init: false,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          lines: [
            `fatal: Failed to create repository '${repoName}' on GitHub (${res.statusText})`,
            errJson.message ? `Details: ${errJson.message}` : '',
          ].filter(Boolean),
        };
      }

      const repoData = await res.json();
      const cloneUrl = repoData.clone_url || repoData.html_url + '.git';

      this.setRemote('origin', cloneUrl);

      return {
        success: true,
        repoUrl: repoData.html_url,
        lines: [
          `✓ Created repository '${repoData.full_name}' on GitHub (${isPrivate ? 'private' : 'public'})!`,
          `URL: ${repoData.html_url}`,
          `Configured remote 'origin' -> ${cloneUrl}`,
          `Next step: Run 'git push -u origin main' to push your workspace files!`,
        ],
      };
    } catch (err: any) {
      return {
        success: false,
        lines: [`fatal: Network error creating repository: ${err.message}`],
      };
    }
  }

  /**
   * Clone a public or private GitHub repository into workspace FileNode[].
   */
  public async cloneGitHub(repoUrl: string): Promise<{ success: boolean; files?: FileNode[]; message: string }> {
    try {
      const parsed = this.parseGitHubUrl(repoUrl);
      if (!parsed) {
        return {
          success: false,
          message: `fatal: repository '${repoUrl}' does not exist or invalid GitHub URL format. Use https://github.com/owner/repo`,
        };
      }

      const { owner, repo } = parsed;
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
      };
      if (this.githubToken) {
        headers['Authorization'] = `Bearer ${this.githubToken}`;
      }

      // 1. Fetch repo info (default branch)
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
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
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        { headers }
      );
      if (!treeRes.ok) {
        return {
          success: false,
          message: `fatal: failed to fetch repository file tree from GitHub (${treeRes.statusText})`,
        };
      }
      const treeData = await treeRes.json();
      const treeItems: any[] = (treeData.tree || []).slice(0, 60);

      // Build file tree
      const newFiles: FileNode[] = [];

      for (const item of treeItems) {
        if (item.type === 'blob') {
          let content = '';
          try {
            const blobRes = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/git/blobs/${item.sha}`,
              { headers }
            );
            if (blobRes.ok) {
              const bData = await blobRes.json();
              content = bData.encoding === 'base64' ? b64DecodeUnicode(bData.content) : bData.content;
            } else {
              const rawRes = await fetch(
                `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${item.path}`
              );
              if (rawRes.ok) content = await rawRes.text();
            }
          } catch {
            content = '// Could not load raw file content';
          }

          const pathParts = item.path.split('/');
          const fileName = pathParts.pop();

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
        message: `Cloning into '${repo}'...\nremote: Enumerating objects: ${treeItems.length}, done.\nremote: Total ${treeItems.length} (delta 0), reused 0 (delta 0)\nReceiving objects: 100% (${treeItems.length}/${treeItems.length}), done.\n✓ Cloned repository into workspace and configured remote origin.`,
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
