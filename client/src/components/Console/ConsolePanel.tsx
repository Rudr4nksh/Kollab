import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  Eye, 
  Trash2, 
  X,
  Plus, 
  Maximize2, 
  Minimize2, 
  AlertCircle,
  FolderGit2,
  GitBranch,
  ExternalLink,
  RotateCw,
  Monitor,
  Tablet,
  Smartphone,
  ShieldCheck,
  Lock,
  Keyboard,
  Square
} from 'lucide-react';
import type { ConsoleLogItem, FileNode } from '../../types/index.ts';
import { findFileByPath, getLanguageFromFilename } from '../../services/fileUtils.ts';
import { gitService } from '../../services/gitService.ts';
import { socketService } from '../../services/socket.ts';
import styles from './ConsolePanel.module.css';

interface TerminalLineItem {
  id: string;
  type: 'command' | 'stdout' | 'stderr' | 'info' | 'system' | 'success' | 'login_prompt';
  text?: string;
  command?: string;
  cwd?: string;
  user?: string;
  branch?: string;
}

interface ConsolePanelProps {
  logs?: ConsoleLogItem[];
  onClearLogs?: () => void;
  onExecuteCommand?: (code: string) => void;
  files: FileNode[];
  activeFileContent?: string;
  activeFilePath?: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  userName?: string;
  roomId?: string;
  activeTab?: 'terminal' | 'problems' | 'preview';
  onTabChange?: (tab: 'terminal' | 'problems' | 'preview') => void;
  runTrigger?: { id: number; file: FileNode } | null;
  stdinInput?: string;
  onStdinChange?: (val: string) => void;
  onCreateFile?: (name: string, parentPath?: string) => void;
  onCreateFolder?: (name: string, parentPath?: string) => void;
  onDeleteNode?: (path: string) => void;
  onUpdateFileContent?: (path: string, content: string) => void;
  onFilesChange?: (files: FileNode[]) => void;
  onGitPush?: (commitUrl: string, message: string) => void;
  onRunningChange?: (running: boolean) => void;
  height?: number;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  files,
  activeFileContent,
  activeFilePath,
  isOpen: _isOpen,
  onToggleOpen,
  userName = 'collaborator',
  roomId = 'workspace',
  activeTab,
  onTabChange,
  runTrigger,
  stdinInput = '',
  height: _height,
  isMaximized,
  onToggleMaximize,
  onStdinChange,
  onCreateFile,
  onCreateFolder,
  onDeleteNode,
  onUpdateFileContent,
  onFilesChange,
  onGitPush,
  onRunningChange,
}) => {
  const [tab, setInternalTab] = useState<'terminal' | 'problems' | 'preview'>(activeTab || 'terminal');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewKey, setPreviewKey] = useState(0);
  const [showStdin, setShowStdin] = useState(false);
  const [internalMaximized, setInternalMaximized] = useState(false);
  const maximized = isMaximized !== undefined ? isMaximized : internalMaximized;

  const handleToggleMaximize = () => {
    if (onToggleMaximize) {
      onToggleMaximize();
    } else {
      setInternalMaximized(!internalMaximized);
    }
  };

  useEffect(() => {
    if (activeTab) {
      setInternalTab(activeTab);
    }
  }, [activeTab]);

  const handleSetTab = (newTab: 'terminal' | 'problems' | 'preview') => {
    setInternalTab(newTab);
    if (onTabChange) {
      onTabChange(newTab);
    }
  };
  const [inputVal, setInputVal] = useState('');
  const [cwd, setCwd] = useState('/');
  const [gitBranch, setGitBranch] = useState(gitService.getBranch());
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Initialize git repository with existing files if not initialized yet
  useEffect(() => {
    if (files.length > 0 && !gitService.getHeadCommit()) {
      gitService.init(files, userName);
      setGitBranch(gitService.getBranch());
    }
  }, [files, userName]);

  const [terminalLines, setTerminalLines] = useState<TerminalLineItem[]>([
    {
      id: 'banner_1',
      type: 'system',
      text: `Kollab Integrated Terminal (bash) — Workspace Room: ${roomId}
Type 'help' for shell commands or click '▶ Run' to compile & execute code directly here.`,
    },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Auto-scroll terminal on new lines
  useEffect(() => {
    if (tab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLines, tab]);

  // Listen to interactive terminal events from server
  useEffect(() => {
    const unsubStart = socketService.onTerminalStarted(() => {
      setIsExecuting(true);
      onRunningChange?.(true);
    });

    const unsubOutput = socketService.onTerminalOutput((data) => {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: 'out_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          type: data.type,
          text: data.text,
        },
      ]);
    });

    const unsubExit = socketService.onTerminalExit((data) => {
      setIsExecuting(false);
      onRunningChange?.(false);
      setTerminalLines((prev) => [
        ...prev,
        {
          id: 'stat_' + Date.now(),
          type: data.exitCode === 0 ? 'system' : 'stderr',
          text: `[Process exited with code ${data.exitCode} in ${data.executionTimeMs}ms]`,
        },
      ]);
    });

    return () => {
      unsubStart();
      unsubOutput();
      unsubExit();
    };
  }, [onRunningChange]);

  // Execute a file through backend runner directly into the terminal
  const runCodeInTerminal = (file: FileNode, inputStr = stdinInput) => {
    const lang = file.language || getLanguageFromFilename(file.name);
    const code = file.content || activeFileContent || '';

    // Command echo line
    const cmdEcho: TerminalLineItem = {
      id: 'cmd_' + Date.now(),
      type: 'command',
      command: `run ${file.name}`,
      cwd,
      user: userName,
      branch: gitBranch,
    };

    setTerminalLines((prev) => [...prev, cmdEcho]);
    setIsExecuting(true);
    onRunningChange?.(true);

    socketService.emitTerminalRun({
      language: lang,
      code,
      filename: file.name,
      initialInput: inputStr,
    });
  };

  // Listen for run trigger from top-bar ▶ Run button
  const prevRunTriggerId = useRef<number | null>(null);
  useEffect(() => {
    if (runTrigger && runTrigger.id !== prevRunTriggerId.current) {
      prevRunTriggerId.current = runTrigger.id;
      setInternalTab('terminal');
      if (onTabChange) onTabChange('terminal');
      runCodeInTerminal(runTrigger.file);
    }
  }, [runTrigger]);

  // Focus input when clicking terminal container
  const handleContainerClick = () => {
    terminalInputRef.current?.focus();
  };

  // 1-Click GitHub Sign In popup
  const handleTerminalGitHubLogin = async () => {
    setTerminalLines((prev) => [
      ...prev,
      {
        id: 'out_' + Date.now(),
        type: 'info',
        text: 'Opening GitHub authorization window...',
      },
    ]);
    const res = await gitService.loginWithGitHub();
    const user = res.user;
    if (res.success && user) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: 'out_' + Date.now(),
          type: 'success',
          text: `✓ Logged in as @${user.login} (${user.name || 'GitHub User'})!\nYou can now use git push, git commit, git pull, and repository commands.`,
        },
      ]);
    } else {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: 'out_' + Date.now(),
          type: 'stderr',
          text: `fatal: ${res.error || 'GitHub sign-in was not completed.'}`,
        },
      ]);
    }
  };

  // Helper: Normalize path
  const normalizePath = (base: string, relative: string): string => {
    if (relative.startsWith('/')) {
      const parts = relative.split('/').filter(Boolean);
      return '/' + parts.join('/');
    }
    const stack = base.split('/').filter(Boolean);
    const segs = relative.split('/').filter(Boolean);
    for (const seg of segs) {
      if (seg === '.') continue;
      if (seg === '..') {
        stack.pop();
      } else {
        stack.push(seg);
      }
    }
    return '/' + stack.join('/');
  };

  // Helper: Find node at path
  const getNodeAtPath = (nodes: FileNode[], targetPath: string): FileNode | null => {
    const clean = targetPath.trim().replace(/\/+$/, '') || '/';
    if (clean === '/') return { id: 'root', name: '/', path: '/', type: 'folder', children: nodes };
    for (const n of nodes) {
      const nClean = n.path.trim().replace(/\/+$/, '') || '/';
      if (nClean === clean) return n;
      if (n.children) {
        const sub = getNodeAtPath(n.children, clean);
        if (sub) return sub;
      }
    }
    return null;
  };

  // Helper: Get files/folders in directory
  const getDirContents = (targetPath: string): FileNode[] => {
    const clean = targetPath.trim().replace(/\/+$/, '') || '/';
    if (clean === '/') return files;
    const node = getNodeAtPath(files, clean);
    return node && node.type === 'folder' ? node.children || [] : [];
  };

  // Helper: Generate tree ASCII
  const generateAsciiTree = (nodes: FileNode[], prefix = ''): string => {
    let result = '';
    nodes.forEach((n, idx) => {
      const isLast = idx === nodes.length - 1;
      const pointer = isLast ? '└── ' : '├── ';
      result += `${prefix}${pointer}${n.name}${n.type === 'folder' ? '/' : ''}\n`;
      if (n.children && n.children.length > 0) {
        result += generateAsciiTree(n.children, prefix + (isLast ? '    ' : '│   '));
      }
    });
    return result;
  };

  // Execute terminal shell command
  const executeTerminalCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) {
      setTerminalLines((prev) => [
        ...prev,
        {
          id: 'cmd_' + Date.now(),
          type: 'command',
          command: '',
          cwd,
          user: userName,
          branch: gitBranch,
        },
      ]);
      return;
    }

    // Add command echo line
    const cmdEcho: TerminalLineItem = {
      id: 'cmd_' + Date.now(),
      type: 'command',
      command: trimmed,
      cwd,
      user: userName,
      branch: gitBranch,
    };

    // Update history
    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    const outputLines: TerminalLineItem[] = [];

    const addOut = (text: string, type: TerminalLineItem['type'] = 'stdout') => {
      outputLines.push({
        id: 'out_' + Math.random().toString(36).substring(2, 9),
        type,
        text,
      });
    };

    if (cmd === 'clear' || cmd === 'cls') {
      setTerminalLines([]);
      return;
    }

    switch (cmd) {
      case 'help':
        addOut(`Kollab VS Code Shell - Supported Commands:
  File Operations:
    ls, dir           List files and directories in current folder
    cd <dir>          Change directory (e.g. cd project, cd .., cd /)
    pwd               Print working directory path
    cat, type <file>  View content of a file
    touch <file>      Create a new file in workspace
    mkdir <dir>       Create a new folder in workspace
    rm, del <target>  Remove a file or folder from workspace
    echo <text>       Print text or write to file (e.g. echo "code" > main.js)
    tree              Display ASCII directory structure

  Git & GitHub:
    git init               Initialize Git repository
    git status             Show working tree status
    git add <file>         Add file contents to the index (e.g. git add .)
    git commit -m          Record changes to repository
    git push               Commit & push directly to GitHub website
    git pull               Pull latest files from GitHub repository
    git config             Manage user identity & GitHub tokens
    git remote             Manage remote repository URLs (e.g. origin)
    git clone <url>        Clone GitHub repository into workspace
    git log                Show commit history (--oneline supported)
    git branch             List, create, or delete branches
    git checkout           Switch branches or restore files (-b supported)
    git diff               Show changes between commits and working tree
    git reset              Unstage changes or reset files
    gh auth login <token>  Authenticate with GitHub Personal Access Token
    gh repo create <name>  Create a new repository on your GitHub account

  Execution & Languages:
    run [file]        Execute active file or specified file with interactive stdin
    node <file>       Execute JavaScript / TypeScript (.js, .ts)
    python <file>     Execute Python script (.py)
    g++, gcc <file>   Compile & execute C++ / C programs (.cpp, .c)
    java, javac       Compile & run Java classes (.java)
    go run <file>     Execute Go programs (.go)
    rustc <file>      Compile & execute Rust programs (.rs)
    php <file>        Execute PHP script (.php)
    ruby <file>       Execute Ruby script (.rb)
    bash, sh <file>   Execute Shell scripts (.sh)
    clear, cls        Clear terminal output
    whoami            Print current collaborator username
    date              Print current date and time`, 'info');
        break;

      case 'clear':
      case 'cls':
        setTerminalLines([]);
        return;

      case 'pwd':
        addOut(cwd);
        break;

      case 'whoami':
        addOut(userName);
        break;

      case 'date':
        addOut(new Date().toString());
        break;

      case 'cd': {
        const target = args[0];
        if (!target || target === '~' || target === '/') {
          setCwd('/');
        } else if (target === '..') {
          const parts = cwd.split('/').filter(Boolean);
          parts.pop();
          setCwd(parts.length > 0 ? '/' + parts.join('/') : '/');
        } else {
          const next = normalizePath(cwd, target);
          const node = getNodeAtPath(files, next);
          if (node && node.type === 'folder') {
            setCwd(next);
          } else {
            addOut(`cd: no such file or directory: ${target}`, 'stderr');
          }
        }
        break;
      }

      case 'ls':
      case 'dir': {
        const target = args[0] ? normalizePath(cwd, args[0]) : cwd;
        const items = getDirContents(target);
        if (items.length === 0) {
          addOut('(empty directory)', 'system');
        } else {
          const formatted = items
            .map((item) => {
              const isDir = item.type === 'folder';
              return isDir ? `\x1b[36m📁 ${item.name}/\x1b[0m` : `📄 ${item.name}`;
            })
            .join('    ');
          addOut(formatted);
        }
        break;
      }

      case 'cat':
      case 'type': {
        const fileTarget = args[0];
        if (!fileTarget) {
          addOut(`usage: ${cmd} <filename>`, 'stderr');
        } else {
          const target = normalizePath(cwd, fileTarget);
          const node = getNodeAtPath(files, target);
          if (!node) {
            addOut(`${cmd}: ${fileTarget}: No such file`, 'stderr');
          } else if (node.type === 'folder') {
            addOut(`${cmd}: ${fileTarget}: Is a directory`, 'stderr');
          } else {
            addOut(node.content || '(empty file)');
          }
        }
        break;
      }

      case 'touch': {
        const fileName = args[0];
        if (!fileName) {
          addOut('usage: touch <filename>', 'stderr');
        } else {
          if (onCreateFile) {
            onCreateFile(fileName, cwd === '/' ? undefined : cwd);
            addOut(`Created file ${fileName}`, 'success');
          } else {
            addOut(`File creation handler ready.`, 'info');
          }
        }
        break;
      }

      case 'mkdir': {
        const dirName = args[0];
        if (!dirName) {
          addOut('usage: mkdir <directory_name>', 'stderr');
        } else {
          if (onCreateFolder) {
            onCreateFolder(dirName, cwd === '/' ? undefined : cwd);
            addOut(`Created directory ${dirName}/`, 'success');
          } else {
            addOut(`Folder creation handler ready.`, 'info');
          }
        }
        break;
      }

      case 'rm':
      case 'del': {
        const targetName = args[0];
        if (!targetName) {
          addOut(`usage: ${cmd} <file_or_directory>`, 'stderr');
        } else {
          const targetPath = normalizePath(cwd, targetName);
          const node = getNodeAtPath(files, targetPath);
          if (!node) {
            addOut(`${cmd}: cannot remove '${targetName}': No such file or directory`, 'stderr');
          } else {
            if (onDeleteNode) {
              onDeleteNode(targetPath);
              addOut(`Removed ${targetPath}`, 'success');
            }
          }
        }
        break;
      }

      case 'echo': {
        const fullText = args.join(' ');
        // Check for redirection: echo "hello" > file.txt
        const redirectMatch = fullText.match(/^(.*?)\s*>>?\s*([a-zA-Z0-9_.\-/]+)$/);
        if (redirectMatch) {
          const contentToWrite = redirectMatch[1].replace(/^["']|["']$/g, '');
          const targetFile = redirectMatch[2];
          const targetPath = normalizePath(cwd, targetFile);
          const existing = getNodeAtPath(files, targetPath);

          if (existing && existing.type === 'file' && onUpdateFileContent) {
            const isAppend = fullText.includes('>>');
            const newContent = isAppend ? (existing.content || '') + '\n' + contentToWrite : contentToWrite;
            onUpdateFileContent(targetPath, newContent);
            addOut(`Updated ${targetFile}`, 'success');
          } else if (onCreateFile) {
            onCreateFile(targetFile, cwd === '/' ? undefined : cwd);
            setTimeout(() => {
              if (onUpdateFileContent) onUpdateFileContent(targetPath, contentToWrite);
            }, 100);
            addOut(`Created ${targetFile} and wrote content`, 'success');
          }
        } else {
          addOut(fullText.replace(/^["']|["']$/g, ''));
        }
        break;
      }

      case 'tree': {
        const treeAscii = generateAsciiTree(files);
        addOut(`.\n${treeAscii || '(empty workspace)'}`, 'info');
        break;
      }

      case 'git': {
        const sub = args[0]?.toLowerCase();
        if (!sub) {
          addOut(`usage: git [--version] [--help] <command> [<args>]

These are common Git commands:
   init       Create an empty Git repository
   clone      Clone a repository into workspace
   status     Show the working tree status
   add        Add file contents to the index
   commit     Record changes to the repository
   log        Show commit logs
   diff       Show changes between commits, commit and working tree
   branch     List, create, or delete branches
   checkout   Switch branches or restore working tree files
   remote     Manage set of tracked repositories
   push       Push changes to remote repository
   reset      Unstage changes or reset HEAD`);
          break;
        }

        if (sub === 'init') {
          const res = gitService.init(files, userName);
          setGitBranch(gitService.getBranch());
          addOut(res, 'success');
        } else if (sub === 'status') {
          const st = gitService.getStatus(files);
          addOut(`On branch ${st.branch}`);
          addOut(`Your branch is up to date with 'origin/${st.branch}'.\n`);

          if (st.staged.length > 0) {
            addOut(`Changes to be committed:\n  (use "git restore --staged <file>..." to unstage)`);
            st.staged.forEach((s) => {
              const label = s.status === 'A' ? 'new file:   ' : s.status === 'M' ? 'modified:   ' : 'deleted:    ';
              addOut(`\t${label} ${s.path}`, 'success');
            });
            addOut('');
          }

          if (st.unstaged.length > 0) {
            addOut(`Changes not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n  (use "git restore <file>..." to discard changes in working directory)`);
            st.unstaged.forEach((u) => {
              const label = u.status === 'M' ? 'modified:   ' : 'deleted:    ';
              addOut(`\t${label} ${u.path}`, 'stderr');
            });
            addOut('');
          }

          if (st.untracked.length > 0) {
            addOut(`Untracked files:\n  (use "git add <file>..." to include in what will be committed)`);
            st.untracked.forEach((u) => {
              addOut(`\t${u}`, 'stderr');
            });
            addOut('');
          }

          if (st.staged.length === 0 && st.unstaged.length === 0 && st.untracked.length === 0) {
            addOut('nothing to commit, working tree clean', 'info');
          }
        } else if (sub === 'add') {
          const target = args[1] || '.';
          const res = gitService.add(target, files);
          addOut(res, 'info');
        } else if (sub === 'commit') {
          const mIdx = args.indexOf('-m');
          let msg = '';
          if (mIdx !== -1 && args[mIdx + 1]) {
            msg = args.slice(mIdx + 1).join(' ').replace(/^["']|["']$/g, '');
          }
          if (!msg) {
            addOut(`error: switch 'm' requires a value (e.g. git commit -m "commit message")`, 'stderr');
          } else {
            const res = gitService.commit(msg, files, userName);
            addOut(res.output, res.success ? 'success' : 'stderr');
          }
        } else if (sub === 'log') {
          const isOneLine = args.includes('--oneline');
          const logsList = gitService.getLog(isOneLine);
          logsList.forEach((l) => addOut(l));
        } else if (sub === 'branch') {
          if (args.length === 1) {
            gitService.listBranches().forEach((b) => addOut(b));
          } else if (args[1] === '-d' || args[1] === '-D') {
            const bName = args[2];
            addOut(gitService.deleteBranch(bName), 'info');
          } else if (args[1] === '-M' || args[1] === '-m') {
            const newName = args[2];
            addOut(gitService.createBranch(newName), 'info');
            setGitBranch(gitService.getBranch());
          } else {
            addOut(gitService.createBranch(args[1]), 'info');
          }
        } else if (sub === 'checkout' || sub === 'switch') {
          if (args[1] === '-b' || args[1] === '-c') {
            const bName = args[2];
            if (!bName) {
              addOut(`fatal: missing branch name for -b`, 'stderr');
            } else {
              addOut(gitService.checkoutNewBranch(bName), 'success');
              setGitBranch(gitService.getBranch());
            }
          } else {
            const bName = args[1];
            if (!bName) {
              addOut(`fatal: you must specify a branch to checkout`, 'stderr');
            } else {
              const res = gitService.checkoutBranch(bName);
              addOut(res.output, res.success ? 'success' : 'stderr');
              if (res.success) {
                setGitBranch(gitService.getBranch());
                if (res.files && onFilesChange) {
                  onFilesChange(res.files);
                }
              }
            }
          }
        } else if (sub === 'diff') {
          const targetFile = args[1];
          const diffs = gitService.getDiff(targetFile, files);
          diffs.forEach((d) => addOut(d, d.startsWith('+') ? 'success' : d.startsWith('-') ? 'stderr' : 'info'));
        } else if (sub === 'reset' || sub === 'restore') {
          const target = args.find((a) => a !== 'reset' && a !== 'restore' && a !== '--staged');
          addOut(gitService.reset(target), 'info');
        } else if (sub === 'remote') {
          if (args[1] === 'add') {
            const rName = args[2] || 'origin';
            const rUrl = args[3];
            if (!rUrl) {
              addOut(`usage: git remote add <name> <url>`, 'stderr');
            } else {
              addOut(gitService.setRemote(rName, rUrl), 'success');
            }
          } else if (args[1] === 'rm' || args[1] === 'remove') {
            const rName = args[2];
            if (!rName) addOut(`usage: git remote rm <name>`, 'stderr');
            else addOut(gitService.removeRemote(rName), 'info');
          } else if (args[1] === 'set-url') {
            const rName = args[2];
            const rUrl = args[3];
            if (!rName || !rUrl) addOut(`usage: git remote set-url <name> <url>`, 'stderr');
            else addOut(gitService.setRemote(rName, rUrl), 'success');
          } else {
            gitService.getRemotes().forEach((r) => addOut(r));
          }
        } else if (sub === 'config') {
          const cleanArgs = args.slice(1).filter((a) => a !== '--global');
          if (cleanArgs.includes('--list') || cleanArgs.includes('-l')) {
            const allConf = gitService.getAllConfig();
            if (allConf.length === 0) {
              addOut(`No git configuration set. Configure identity or GitHub token:\n  git config user.name "Your Name"\n  git config user.email "your@email.com"\n  git config github.token "YOUR_PAT"`, 'info');
            } else {
              allConf.forEach(([k, v]) => {
                const displayVal = k.includes('token') ? `${v.substring(0, 6)}...` : v;
                addOut(`${k}=${displayVal}`);
              });
            }
          } else if (cleanArgs[0] === '--get') {
            const key = cleanArgs[1];
            const val = gitService.getConfig(key);
            if (val) addOut(key.includes('token') ? `${val.substring(0, 6)}...` : val);
            else addOut(`error: key '${key}' not found`, 'stderr');
          } else if (cleanArgs.length === 1) {
            const key = cleanArgs[0];
            const val = gitService.getConfig(key);
            if (val) addOut(key.includes('token') ? `${val.substring(0, 6)}...` : val);
            else addOut(`error: key '${key}' not found`, 'stderr');
          } else if (cleanArgs.length >= 2) {
            const key = cleanArgs[0];
            const val = cleanArgs.slice(1).join(' ').replace(/^["']|["']$/g, '');
            if (key.toLowerCase() === 'github.token') {
              addOut(`Verifying GitHub Personal Access Token...`, 'info');
              const authRes = await gitService.setGitHubToken(val);
              if (authRes.success && authRes.user) {
                addOut(`✓ Authenticated successfully with GitHub as @${authRes.user.login} (${authRes.user.name || 'User'})!`, 'success');
                addOut(`Token saved. You can now commit and push directly to GitHub website.`, 'info');
              } else {
                addOut(`warning: Token saved, but GitHub verification returned: ${authRes.error}`, 'stderr');
              }
            } else {
              gitService.setConfig(key, val);
              addOut(`Set ${key} = ${val}`, 'info');
            }
          } else {
            addOut(`usage: git config [--global] <key> [value]\n       git config --list`, 'info');
          }
        } else if (sub === 'push') {
          if (!gitService.getGitHubToken()) {
            outputLines.push({
              id: 'login_' + Date.now(),
              type: 'login_prompt',
              text: 'Sign in with GitHub to push your commits to github.com.',
            });
            setTerminalLines((prev) => [...prev, cmdEcho, ...outputLines]);
            return;
          }

          const filteredArgs = args.slice(1).filter((a) => !a.startsWith('-'));
          const remote = filteredArgs[0] || 'origin';
          const targetBranch = filteredArgs[1] || gitBranch || 'main';

          addOut(`Pushing workspace to GitHub remote '${remote}' (${targetBranch})...`, 'info');
          const pushRes = await gitService.pushGitHub(files, remote, targetBranch);
          pushRes.lines.forEach((l) => {
            const isSuccess = l.startsWith('✓') || l.startsWith('Commit on GitHub:');
            const isError = l.startsWith('fatal:') || l.startsWith('error:');
            addOut(l, isSuccess ? 'success' : isError ? 'stderr' : 'info');
          });
          if (pushRes.success) {
            setGitBranch(targetBranch);
            if (onGitPush && pushRes.commitUrl) {
              onGitPush(pushRes.commitUrl, `Pushed workspace to ${targetBranch}`);
            }
          }
        } else if (sub === 'pull') {
          if (!gitService.getGitHubToken()) {
            outputLines.push({
              id: 'login_' + Date.now(),
              type: 'login_prompt',
              text: 'Sign in with GitHub to pull files from repository.',
            });
            setTerminalLines((prev) => [...prev, cmdEcho, ...outputLines]);
            return;
          }

          const filteredArgs = args.slice(1).filter((a) => !a.startsWith('-'));
          const remote = filteredArgs[0] || 'origin';
          const targetBranch = filteredArgs[1] || gitBranch || 'main';

          addOut(`Pulling latest files from GitHub remote '${remote}' (${targetBranch})...`, 'info');
          const pullRes = await gitService.pullGitHub(remote, targetBranch);
          pullRes.lines.forEach((l) => {
            const isSuccess = l.startsWith('✓');
            const isError = l.startsWith('fatal:') || l.startsWith('error:');
            addOut(l, isSuccess ? 'success' : isError ? 'stderr' : 'info');
          });
          if (pullRes.success && pullRes.files && onFilesChange) {
            onFilesChange(pullRes.files);
          }
        } else if (sub === 'clone') {
          const repoUrl = args[1];
          if (!repoUrl) {
            addOut(`fatal: You must specify a repository to clone (e.g. git clone https://github.com/facebook/react)`, 'stderr');
          } else {
            addOut(`Cloning into '${repoUrl}'...`, 'info');
            const res = await gitService.cloneGitHub(repoUrl);
            addOut(res.message, res.success ? 'success' : 'stderr');
            if (res.success) {
              setGitBranch(gitService.getBranch());
              if (res.files && onFilesChange) {
                onFilesChange(res.files);
              }
            }
          }
        } else {
          addOut(`git: '${sub}' is not a git command. See 'git --help'.`, 'stderr');
        }
        break;
      }

      case 'gh': {
        const sub = args[0]?.toLowerCase();
        if (!sub || sub === 'help' || sub === '--help') {
          addOut(`GitHub CLI (gh) - Kollab Edition:
  gh auth login <token>        Authenticate with GitHub Personal Access Token
  gh auth status               Display current logged-in GitHub account
  gh auth logout               Clear authenticated GitHub token
  gh repo create <name>        Create a new repository on your GitHub account
  gh repo view                 View remote GitHub repository details`, 'info');
          break;
        }

        if (sub === 'auth') {
          const authSub = args[1]?.toLowerCase();
          if (authSub === 'login') {
            const token = args[2];
            if (token) {
              addOut(`Verifying GitHub token...`, 'info');
              const res = await gitService.setGitHubToken(token);
              if (res.success && res.user) {
                addOut(`✓ Logged in to github.com account @${res.user.login} (${res.user.name || 'User'})!`, 'success');
                addOut(`Token is configured for all git push and git clone operations.`, 'info');
              } else {
                addOut(`fatal: ${res.error || 'Authentication failed'}`, 'stderr');
              }
            } else {
              await handleTerminalGitHubLogin();
            }
          } else if (authSub === 'status') {
            const user = gitService.getGitHubUser();
            const token = gitService.getGitHubToken();
            if (token && user) {
              addOut(`github.com\n  ✓ Logged in to github.com account @${user.login} (${user.name || 'User'})\n  - Active account: true\n  - Token: ${token.substring(0, 6)}... (valid)\n  - Scopes: 'repo', 'read:user'`, 'success');
            } else if (token) {
              addOut(`github.com\n  ! Token configured (${token.substring(0, 6)}...), but user profile not verified.\n  Run 'gh auth login <token>' to verify.`, 'info');
            } else {
              addOut(`You are not logged into any GitHub hosts. Run 'gh auth login <token>' to authenticate.`, 'stderr');
            }
          } else if (authSub === 'logout') {
            gitService.clearGitHubAuth();
            addOut(`✓ Logged out of GitHub account.`, 'info');
          } else {
            addOut(`usage: gh auth <login|status|logout>`, 'stderr');
          }
        } else if (sub === 'repo') {
          const repoSub = args[1]?.toLowerCase();
          if (repoSub === 'create') {
            const repoName = args[2];
            if (!repoName) {
              addOut(`usage: gh repo create <name> [--public|--private]`, 'stderr');
            } else {
              const isPrivate = args.includes('--private');
              addOut(`Creating ${isPrivate ? 'private' : 'public'} repository '${repoName}' on GitHub...`, 'info');
              const res = await gitService.createGitHubRepo(repoName, isPrivate);
              res.lines.forEach((l) => {
                const isSuccess = l.startsWith('✓');
                const isError = l.startsWith('fatal:');
                addOut(l, isSuccess ? 'success' : isError ? 'stderr' : 'info');
              });
            }
          } else if (repoSub === 'view') {
            const remoteUrl = gitService.getRemote('origin');
            if (remoteUrl) {
              addOut(`Remote Origin: ${remoteUrl}`, 'info');
              const parsed = gitService.parseGitHubUrl(remoteUrl);
              if (parsed) {
                addOut(`Repository: ${parsed.owner}/${parsed.repo}`, 'success');
                addOut(`Web URL: https://github.com/${parsed.owner}/${parsed.repo}`, 'info');
              }
            } else {
              addOut(`No remote repository configured. Set one with: git remote add origin <url>`, 'stderr');
            }
          } else {
            addOut(`usage: gh repo <create|view>`, 'stderr');
          }
        } else {
          addOut(`gh: '${sub}' is not a recognized gh command. Type 'gh help'.`, 'stderr');
        }
        break;
      }

      case 'g++':
      case 'gcc':
      case 'cpp':
      case 'c++':
      case 'c': {
        const srcArg = args.find((a) => !a.startsWith('-')) || (activeFilePath ? findFileByPath(files, activeFilePath)?.name : '');
        if (!srcArg) {
          addOut(`fatal error: no input files\nType 'g++ <filename.cpp>' or 'run' to execute.`, 'stderr');
        } else {
          const target = normalizePath(cwd, srcArg);
          const node = getNodeAtPath(files, target);
          if (!node || node.type !== 'file') {
            addOut(`${cmd}: ${srcArg}: No such file or directory`, 'stderr');
          } else {
            runCodeInTerminal(node);
          }
        }
        break;
      }

      case 'node': {
        const scriptArg = args[0];
        if (!scriptArg) {
          addOut(`Welcome to Node.js v20.12.2.\nType '.exit' or run a file using: node <filename.js>`, 'info');
        } else if (scriptArg === '-e' || scriptArg === '--eval') {
          const codeToEval = args.slice(1).join(' ').replace(/^["']|["']$/g, '');
          try {
            const captured: string[] = [];
            const mockConsole = {
              log: (...a: any[]) => captured.push(a.join(' ')),
              error: (...a: any[]) => captured.push('ERROR: ' + a.join(' ')),
            };
            const fn = new Function('console', codeToEval);
            const res = fn(mockConsole);
            captured.forEach((c) => addOut(c));
            if (res !== undefined) addOut(String(res), 'success');
          } catch (e: any) {
            addOut(`EvalError: ${e.message}`, 'stderr');
          }
        } else {
          const target = normalizePath(cwd, scriptArg);
          const node = getNodeAtPath(files, target);
          if (!node || node.type !== 'file') {
            addOut(`node: cannot find module '${scriptArg}'`, 'stderr');
          } else {
            runCodeInTerminal(node);
          }
        }
        break;
      }

      case 'python':
      case 'python3': {
        const pyFile = args[0] || (activeFilePath?.endsWith('.py') ? findFileByPath(files, activeFilePath)?.name : '');
        if (!pyFile) {
          addOut(`Python 3.12 (Kollab Native Runner)\nType 'python <filename.py>' to execute script.`, 'info');
        } else {
          const target = normalizePath(cwd, pyFile);
          const node = getNodeAtPath(files, target);
          if (!node || node.type !== 'file') {
            addOut(`python: can't open file '${pyFile}': [Errno 2] No such file or directory`, 'stderr');
          } else {
            runCodeInTerminal(node);
          }
        }
        break;
      }

      case 'run': {
        const targetName = args[0];
        const targetNode = targetName ? getNodeAtPath(files, normalizePath(cwd, targetName)) : (activeFilePath ? findFileByPath(files, activeFilePath) : null);
        if (!targetNode || targetNode.type !== 'file') {
          addOut(`run: no active file open to execute.`, 'stderr');
        } else {
          const lang = targetNode.language || getLanguageFromFilename(targetNode.name);
          if (lang === 'html' || targetNode.name.endsWith('.html') || targetNode.name.endsWith('.htm')) {
            handleSetTab('preview');
            addOut(`Switched to Live Preview tab for ${targetNode.name}.`, 'success');
            break;
          }
          runCodeInTerminal(targetNode);
        }
        break;
      }

      case 'java':
      case 'javac': {
        const javaFile = args[0] || (activeFilePath?.endsWith('.java') ? findFileByPath(files, activeFilePath)?.name : '');
        if (!javaFile) {
          addOut(`java: fatal error: no java file specified\nType 'java <Main.java>' or 'run' to execute.`, 'stderr');
        } else {
          const target = normalizePath(cwd, javaFile);
          const node = getNodeAtPath(files, target);
          if (!node || node.type !== 'file') {
            addOut(`java: error: ${javaFile}: No such file or directory`, 'stderr');
          } else {
            runCodeInTerminal(node);
          }
        }
        break;
      }

      case 'go': {
        const sub = args[0];
        const goFile = (sub === 'run' ? args[1] : sub) || (activeFilePath?.endsWith('.go') ? findFileByPath(files, activeFilePath)?.name : '');
        if (!goFile) {
          addOut(`go: no Go file specified\nType 'go run <file.go>' or 'run' to execute.`, 'stderr');
        } else {
          const target = normalizePath(cwd, goFile);
          const node = getNodeAtPath(files, target);
          if (!node || node.type !== 'file') {
            addOut(`go: ${goFile}: No such file or directory`, 'stderr');
          } else {
            runCodeInTerminal(node);
          }
        }
        break;
      }

      case 'rust':
      case 'rustc': {
        const rustFile = args[0] || (activeFilePath?.endsWith('.rs') ? findFileByPath(files, activeFilePath)?.name : '');
        if (!rustFile) {
          addOut(`rustc: no input files\nType 'rustc <file.rs>' or 'run' to execute.`, 'stderr');
        } else {
          const target = normalizePath(cwd, rustFile);
          const node = getNodeAtPath(files, target);
          if (!node || node.type !== 'file') {
            addOut(`rustc: error: ${rustFile}: No such file or directory`, 'stderr');
          } else {
            runCodeInTerminal(node);
          }
        }
        break;
      }

      case 'php': {
        const phpFile = args[0] || (activeFilePath?.endsWith('.php') ? findFileByPath(files, activeFilePath)?.name : '');
        if (!phpFile) {
          addOut(`php: no file specified\nType 'php <file.php>' or 'run' to execute.`, 'stderr');
        } else {
          const target = normalizePath(cwd, phpFile);
          const node = getNodeAtPath(files, target);
          if (!node || node.type !== 'file') {
            addOut(`php: error: ${phpFile}: No such file or directory`, 'stderr');
          } else {
            runCodeInTerminal(node);
          }
        }
        break;
      }

      case 'ruby': {
        const rubyFile = args[0] || (activeFilePath?.endsWith('.rb') ? findFileByPath(files, activeFilePath)?.name : '');
        if (!rubyFile) {
          addOut(`ruby: no file specified\nType 'ruby <file.rb>' or 'run' to execute.`, 'stderr');
        } else {
          const target = normalizePath(cwd, rubyFile);
          const node = getNodeAtPath(files, target);
          if (!node || node.type !== 'file') {
            addOut(`ruby: error: ${rubyFile}: No such file or directory`, 'stderr');
          } else {
            runCodeInTerminal(node);
          }
        }
        break;
      }

      case 'bash':
      case 'sh': {
        const shFile = args[0] || (activeFilePath?.endsWith('.sh') ? findFileByPath(files, activeFilePath)?.name : '');
        if (!shFile) {
          addOut(`bash: no script specified\nType 'bash <script.sh>' to execute.`, 'stderr');
        } else {
          const target = normalizePath(cwd, shFile);
          const node = getNodeAtPath(files, target);
          if (!node || node.type !== 'file') {
            addOut(`bash: ${shFile}: No such file or directory`, 'stderr');
          } else {
            runCodeInTerminal(node);
          }
        }
        break;
      }

      default: {
        // Check if it's a simple JS expression e.g. 5 + 5 or Math.PI
        try {
          const evalResult = new Function(`return (${trimmed})`)();
          if (evalResult !== undefined) {
            addOut(typeof evalResult === 'object' ? JSON.stringify(evalResult, null, 2) : String(evalResult), 'success');
            break;
          }
        } catch {
          // not expression
        }
        addOut(`${cmd}: command not found. Type 'help' for available commands.`, 'stderr');
        break;
      }
    }

    setTerminalLines((prev) => [...prev, cmdEcho, ...outputLines]);
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputVal;
    setInputVal('');

    if (isExecuting) {
      // Program is currently executing: send live stdin directly into running process!
      setTerminalLines((prev) => [
        ...prev,
        {
          id: 'stdin_' + Date.now(),
          type: 'stdout',
          text: val,
        },
      ]);
      socketService.emitTerminalStdin(val + '\n');
      return;
    }

    await executeTerminalCommand(val);
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Intercept Ctrl+C to terminate running program
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      if (isExecuting) {
        e.preventDefault();
        socketService.emitTerminalKill();
        setIsExecuting(false);
        onRunningChange?.(false);
        return;
      }
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < commandHistory.length) {
          setHistoryIndex(nextIdx);
          setInputVal(commandHistory[nextIdx]);
        } else {
          setHistoryIndex(-1);
          setInputVal('');
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Autocomplete command, git subcommands, or files
      const gitSubcommands = ['status', 'add', 'commit', 'branch', 'checkout', 'diff', 'log', 'push', 'pull', 'clone', 'remote', 'init', 'reset', 'config'];
      const ghSubcommands = ['auth login', 'auth status', 'auth logout', 'repo create', 'repo view'];
      const commands = [
        'help', 'ls', 'cd', 'pwd', 'cat', 'touch', 'mkdir', 'rm', 'echo', 
        'node', 'python', 'run', 'g++', 'gcc', 'java', 'javac', 'go', 'rustc', 'php', 'ruby', 'bash', 'tree', 'git', 'gh', 'clear',
        ...gitSubcommands.map((s) => `git ${s}`),
        ...ghSubcommands.map((s) => `gh ${s}`),
      ];
      const dirItems = getDirContents(cwd).map((n) => n.name);
      const allChoices = [...commands, ...dirItems];

      const match = allChoices.find((c) => c.startsWith(inputVal.trim()));
      if (match) {
        setInputVal(match + ' ');
      }
    }
  };

  // Build live HTML/CSS/JS preview iframe bundle
  // Build live HTML/CSS/JS preview iframe bundle
  const generatePreviewSrc = () => {
    let html = '';
    let css = '';
    let js = '';

    const extractFiles = (nodes: FileNode[]) => {
      nodes.forEach((n) => {
        if (n.type === 'file') {
          if (n.name.endsWith('.css')) css += `\n/* ${n.name} */\n` + (n.content || '');
          if (n.name.endsWith('.js') && !n.name.endsWith('.config.js')) js += `\n// ${n.name}\n` + (n.content || '');
          if (!html && (n.name.endsWith('.html') || n.name.endsWith('.htm'))) {
            if (!activeFilePath?.endsWith('.html')) {
              html = n.content || '';
            }
          }
        }
        if (n.children) extractFiles(n.children);
      });
    };
    extractFiles(files);

    if (activeFilePath && (activeFilePath.endsWith('.html') || activeFilePath.endsWith('.htm'))) {
      const activeNode = findFileByPath(files, activeFilePath);
      html = activeNode?.content || activeFileContent || '';
    }

    if (!html) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #0f172a;
      color: #94a3b8;
      text-align: center;
    }
    .card {
      background: #1e293b;
      padding: 32px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      max-width: 440px;
    }
    h2 { color: #f8fafc; margin-top: 0; font-size: 18px; }
    p { font-size: 13px; line-height: 1.5; color: #94a3b8; }
    code { background: #334155; padding: 2px 6px; border-radius: 4px; color: #38bdf8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🌐 Live Website Preview</h2>
    <p>Create or open an <code>index.html</code> file in your workspace to preview your website.</p>
  </div>
</body>
</html>`;
    }

    let bundled = html;
    if (css) {
      if (bundled.includes('</head>')) {
        bundled = bundled.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
      } else {
        bundled = `<style>\n${css}\n</style>\n` + bundled;
      }
    }

    const scriptPayload = `
<script>
  window.addEventListener('error', function(e) {
    console.error('[Preview Error]', e.message, 'at ' + (e.filename || '') + ':' + e.lineno);
  });
  try {
    ${js}
  } catch (err) {
    console.error('[Preview Script Error]', err);
  }
</script>
`;

    if (bundled.includes('</body>')) {
      bundled = bundled.replace('</body>', `${scriptPayload}\n</body>`);
    } else {
      bundled += scriptPayload;
    }

    return bundled;
  };

  const handleOpenPreviewNewTab = () => {
    const src = generatePreviewSrc();
    const blob = new Blob([src], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={styles.consolePanel} style={{ height: '100%' }}>
      {/* VS Code Style Header */}
      <div className={styles.header}>
        <div className={styles.tabsGroup}>
          <button
            className={`${styles.tabBtn} ${tab === 'terminal' ? styles.activeTab : ''}`}
            onClick={() => handleSetTab('terminal')}
          >
            <Terminal size={12} />
            <span>TERMINAL</span>
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'problems' ? styles.activeTab : ''}`}
            onClick={() => handleSetTab('problems')}
          >
            <AlertCircle size={12} />
            <span>PROBLEMS</span>
            <span className={styles.tabBadge}>0</span>
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'preview' ? styles.activeTab : ''}`}
            onClick={() => handleSetTab('preview')}
          >
            <Eye size={12} />
            <span>PREVIEW</span>
          </button>
        </div>

        {/* Right side controls */}
        <div className={styles.headerActions}>
          {tab === 'terminal' && (
            <div className={styles.terminalSelector} title="Default Profile">
              <span>1: bash</span>
            </div>
          )}

          {tab === 'terminal' && (
            <button
              type="button"
              className={`${styles.stdinToggleBtn} ${showStdin ? styles.stdinToggleBtnActive : ''}`}
              onClick={() => setShowStdin(!showStdin)}
              title="Toggle standard input (stdin) for programs that read cin, input(), Scanner"
            >
              <Keyboard size={12} />
              <span>Custom Input (stdin)</span>
              {stdinInput.trim().length > 0 && <span className={styles.stdinDot} />}
            </button>
          )}

          {tab === 'terminal' && isExecuting && (
            <button
              type="button"
              className={styles.stopActionBtn}
              onClick={() => {
                socketService.emitTerminalKill();
                setIsExecuting(false);
                onRunningChange?.(false);
              }}
              title="Stop running program (Ctrl+C)"
            >
              <Square size={10} fill="currentColor" />
              <span>Stop</span>
            </button>
          )}

          {tab === 'terminal' && (
            <button
              className={styles.actionBtn}
              onClick={() => {
                setTerminalLines([
                  {
                    id: 'new_term_' + Date.now(),
                    type: 'system',
                    text: `New terminal session started on room ${roomId}.`,
                  },
                ]);
              }}
              title="New Terminal"
            >
              <Plus size={13} />
            </button>
          )}

          <button
            className={styles.actionBtn}
            onClick={() => setTerminalLines([])}
            title="Clear Terminal"
          >
            <Trash2 size={13} />
          </button>

          <button
            className={styles.actionBtn}
            onClick={handleToggleMaximize}
            title={maximized ? 'Restore Panel Size' : 'Maximize Panel Size'}
          >
            {maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <button
            className={styles.actionBtn}
            onClick={onToggleOpen}
            title="Hide Terminal Panel"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={styles.contentBody}>
        {/* Real VS Code Terminal Shell */}
        {tab === 'terminal' && (
          <div className={styles.terminalWrapper}>
            <div className={styles.terminalContainer} onClick={handleContainerClick}>
              <div className={styles.terminalOutput}>
                <div className={styles.terminalBanner}>
                  {`Kollab Integrated Shell (bash) — Workspace Room: ${roomId}`}
                </div>

                {terminalLines.map((line) => {
                  if (line.type === 'command') {
                    return (
                      <div key={line.id} className={styles.commandEcho}>
                        <span className={styles.promptUser}>{line.user || userName}</span>
                        <span className={styles.promptColon}>:</span>
                        <span className={styles.promptPath}>{line.cwd === '/' ? '~' : `~${line.cwd}`}</span>
                        {(line.branch || gitBranch) && (
                          <span className={styles.promptBranch}> ({line.branch || gitBranch})</span>
                        )}
                        <span className={styles.promptSymbol}>$</span>
                        <span className={styles.commandText}>{line.command}</span>
                      </div>
                    );
                  }

                  if (line.type === 'login_prompt') {
                    return (
                      <div key={line.id} className={styles.terminalLoginBanner}>
                        <div className={styles.loginBannerText}>
                          <GitBranch size={15} className={styles.loginIcon} />
                          <span>{line.text || 'GitHub login is required to use Git commands.'}</span>
                        </div>
                        <button
                          type="button"
                          className={styles.loginBannerBtn}
                          onClick={handleTerminalGitHubLogin}
                        >
                          <FolderGit2 size={13} />
                          <span>Sign in with GitHub</span>
                        </button>
                      </div>
                    );
                  }

                  let styleClass = styles.outText;
                  if (line.type === 'success') styleClass = `${styles.outText} ${styles.outSuccess}`;
                  if (line.type === 'stderr') styleClass = `${styles.outText} ${styles.outError}`;
                  if (line.type === 'info') styleClass = `${styles.outText} ${styles.outInfo}`;
                  if (line.type === 'system') styleClass = `${styles.outText} ${styles.outWarning}`;

                  return (
                    <div key={line.id} className={styles.terminalLine}>
                      <pre className={styleClass}>{line.text}</pre>
                    </div>
                  );
                })}

                {/* Active Prompt Input */}
                {isExecuting ? (
                  <form onSubmit={handleTerminalSubmit} className={styles.runningPromptLine}>
                    <span className={styles.runningDot} title="Program is executing" />
                    <span className={styles.runningPromptSymbol}>❯</span>
                    <input
                      ref={terminalInputRef}
                      type="text"
                      className={styles.terminalInput}
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={handleTerminalKeyDown}
                      placeholder="Type input here & press Enter (or Ctrl+C to stop)..."
                      autoFocus
                      spellCheck={false}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className={styles.stopProcessBtn}
                      onClick={() => {
                        socketService.emitTerminalKill();
                        setIsExecuting(false);
                        onRunningChange?.(false);
                      }}
                      title="Stop running program (Ctrl+C)"
                    >
                      Stop
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleTerminalSubmit} className={styles.activeInputLine}>
                    <span className={styles.promptUser}>{userName}</span>
                    <span className={styles.promptColon}>:</span>
                    <span className={styles.promptPath}>{cwd === '/' ? '~' : `~${cwd}`}</span>
                    {gitBranch && (
                      <span className={styles.promptBranch}> ({gitBranch})</span>
                    )}
                    <span className={styles.promptSymbol}>$</span>
                    <input
                      ref={terminalInputRef}
                      type="text"
                      className={styles.terminalInput}
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={handleTerminalKeyDown}
                      autoFocus
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </form>
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>

            {showStdin && (
              <div className={styles.stdinDrawer}>
                <div className={styles.stdinDrawerHeader}>
                  <div className={styles.stdinDrawerTitle}>
                    <Keyboard size={11} />
                    <span>STANDARD INPUT (STDIN)</span>
                  </div>
                  {stdinInput.length > 0 && (
                    <button
                      type="button"
                      className={styles.stdinClearBtn}
                      onClick={() => onStdinChange?.('')}
                      title="Clear standard input"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  className={styles.stdinTextarea}
                  placeholder="Type or paste input for cin >> x, scanf, input(), Scanner..."
                  value={stdinInput}
                  onChange={(e) => onStdinChange?.(e.target.value)}
                  spellCheck={false}
                />
                <div className={styles.stdinFooter}>
                  <span>{stdinInput ? `${stdinInput.split('\n').length} line(s)` : 'Piped to stdin'}</span>
                  <span>{stdinInput.length} chars</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Problems Tab */}
        {tab === 'problems' && (
          <div className={styles.problemsContainer}>
            <AlertCircle size={24} style={{ color: '#2ECC71', marginBottom: 8 }} />
            <span>No problems have been detected in the workspace.</span>
          </div>
        )}

        {/* Live Preview Tab */}
        {tab === 'preview' && (
          <div className={styles.previewContainer}>
            <div className={styles.previewToolbar}>
              <div className={styles.previewUrlBar}>
                <Lock size={11} className={styles.previewLockIcon} />
                <span className={styles.previewUrlText}>
                  {`http://localhost:5173/preview${activeFilePath ? (activeFilePath.endsWith('.html') ? activeFilePath : '/index.html') : '/index.html'}`}
                </span>
                <button
                  type="button"
                  className={styles.previewReloadBtn}
                  onClick={() => setPreviewKey((k) => k + 1)}
                  title="Reload Preview"
                >
                  <RotateCw size={11} />
                </button>
              </div>

              <div className={styles.viewportControls}>
                <button
                  type="button"
                  className={`${styles.viewportBtn} ${previewViewport === 'desktop' ? styles.viewportBtnActive : ''}`}
                  onClick={() => setPreviewViewport('desktop')}
                  title="Desktop View (100%)"
                >
                  <Monitor size={12} />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  className={`${styles.viewportBtn} ${previewViewport === 'tablet' ? styles.viewportBtnActive : ''}`}
                  onClick={() => setPreviewViewport('tablet')}
                  title="Tablet View (768px)"
                >
                  <Tablet size={12} />
                  <span>Tablet</span>
                </button>
                <button
                  type="button"
                  className={`${styles.viewportBtn} ${previewViewport === 'mobile' ? styles.viewportBtnActive : ''}`}
                  onClick={() => setPreviewViewport('mobile')}
                  title="Mobile View (375px)"
                >
                  <Smartphone size={12} />
                  <span>Mobile</span>
                </button>
              </div>

              <div className={styles.previewToolbarRight}>
                <span className={styles.securityPill} title="Safe isolated origin (null). Scripts inside cannot access GitHub tokens or parent localStorage.">
                  <ShieldCheck size={11} />
                  <span>Sandboxed (Safe Origin)</span>
                </span>

                <button
                  type="button"
                  className={styles.openExternalBtn}
                  onClick={handleOpenPreviewNewTab}
                  title="Open this website in a separate browser tab"
                >
                  <ExternalLink size={12} />
                  <span>Open in New Tab ↗</span>
                </button>
              </div>
            </div>

            <div className={styles.previewFrameWrapper}>
              <div
                className={styles.previewFrameContainer}
                style={{
                  width:
                    previewViewport === 'mobile'
                      ? '375px'
                      : previewViewport === 'tablet'
                      ? '768px'
                      : '100%',
                }}
              >
                <iframe
                  key={previewKey}
                  title="Live HTML Preview"
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                  srcDoc={generatePreviewSrc()}
                  className={styles.previewIframe}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
