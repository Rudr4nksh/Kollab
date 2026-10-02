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
  FileText
} from 'lucide-react';
import type { ConsoleLogItem, FileNode } from '../../types/index.ts';
import { findFileByPath, getLanguageFromFilename } from '../../services/fileUtils.ts';
import styles from './ConsolePanel.module.css';

interface TerminalLineItem {
  id: string;
  type: 'command' | 'stdout' | 'stderr' | 'info' | 'system' | 'success';
  text?: string;
  command?: string;
  cwd?: string;
  user?: string;
}

interface ConsolePanelProps {
  logs: ConsoleLogItem[];
  onClearLogs: () => void;
  onExecuteCommand: (code: string) => void;
  files: FileNode[];
  activeFileContent?: string;
  activeFilePath?: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  userName?: string;
  roomId?: string;
  onCreateFile?: (name: string, parentPath?: string) => void;
  onCreateFolder?: (name: string, parentPath?: string) => void;
  onDeleteNode?: (path: string) => void;
  onUpdateFileContent?: (path: string, content: string) => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  logs,
  onClearLogs,
  files,
  activeFileContent,
  activeFilePath,
  isOpen,
  onToggleOpen,
  userName = 'collaborator',
  roomId = 'workspace',
  onCreateFile,
  onCreateFolder,
  onDeleteNode,
  onUpdateFileContent,
}) => {
  const [tab, setTab] = useState<'terminal' | 'output' | 'problems' | 'preview'>('terminal');
  const [inputVal, setInputVal] = useState('');
  const [cwd, setCwd] = useState('/');
  const [isMaximized, setIsMaximized] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [terminalLines, setTerminalLines] = useState<TerminalLineItem[]>([
    {
      id: 'banner_1',
      type: 'system',
      text: `Kollab Integrated Shell (v1.0.0, node v20.x, x86_64-pc-windows)
Type 'help' for a list of available commands or 'clear' to clear screen.`,
    },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal on new lines
  useEffect(() => {
    if (tab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (tab === 'output') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLines, logs, tab]);

  // Focus input when clicking terminal container
  const handleContainerClick = () => {
    terminalInputRef.current?.focus();
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
  const executeTerminalCommand = (rawCmd: string) => {
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

    switch (cmd) {
      case 'help':
        addOut(`Kollab VS Code Shell - Supported Commands:
  ls, dir           List files and directories in current folder
  cd <dir>          Change directory (e.g. cd project, cd .., cd /)
  pwd               Print working directory path
  cat, type <file>  View content of a file
  touch <file>      Create a new file in workspace
  mkdir <dir>       Create a new folder in workspace
  rm, del <target>  Remove a file or folder from workspace
  echo <text>       Print text or write to file (e.g. echo "code" > main.js)
  node <file>       Execute JavaScript with Node.js engine
  python <file>     Execute Python code
  run               Execute current active editor file
  tree              Display ASCII directory structure
  git status        Show workspace git status
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
        const sub = args[0];
        if (sub === 'status') {
          addOut(`On branch main
Your branch is up to date with 'origin/main'.

Workspace files: ${files.length} tracked items
nothing to commit, working tree clean`, 'info');
        } else if (sub === 'branch') {
          addOut(`* main`, 'success');
        } else if (sub === 'log') {
          addOut(`commit 2a265d7a (HEAD -> main)
Author: ${userName} <user@kollab.dev>
Date:   ${new Date().toDateString()}

    feat: synchronized collaborative workspace session`, 'info');
        } else {
          addOut(`git: '${sub}' is not a simulated command. Try 'git status', 'git branch', or 'git log'.`, 'stderr');
        }
        break;
      }

      case 'node': {
        const scriptArg = args[0];
        if (!scriptArg) {
          addOut(`Welcome to Node.js v20.12.2.
Type '.exit' or run a file using: node <filename.js>`, 'info');
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
            try {
              const captured: string[] = [];
              const mockConsole = {
                log: (...a: any[]) => captured.push(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')),
                error: (...a: any[]) => captured.push('ERROR: ' + a.join(' ')),
                warn: (...a: any[]) => captured.push('WARN: ' + a.join(' ')),
              };
              const fn = new Function('console', node.content || '');
              const res = fn(mockConsole);
              captured.forEach((c) => addOut(c, c.startsWith('ERROR:') ? 'stderr' : 'stdout'));
              if (res !== undefined) addOut(String(res), 'success');
              addOut(`[Process exited with code 0]`, 'system');
            } catch (err: any) {
              addOut(err.stack || err.toString(), 'stderr');
            }
          }
        }
        break;
      }

      case 'python':
      case 'python3': {
        const pyFile = args[0];
        if (!pyFile) {
          addOut(`Python 3.12.3 (main, Apr  9 2024, 08:08:12) [GCC 11.4.0] on linux
Type "help", "copyright", "credits" or "license" for more information.`, 'info');
        } else {
          const target = normalizePath(cwd, pyFile);
          const node = getNodeAtPath(files, target);
          if (!node || node.type !== 'file') {
            addOut(`python: can't open file '${pyFile}': [Errno 2] No such file or directory`, 'stderr');
          } else {
            const printMatches = Array.from((node.content || '').matchAll(/print\s*\(\s*(?:f?["'](.*?)["']|(.*?))\s*\)/g));
            if (printMatches.length > 0) {
              printMatches.forEach((m) => addOut(m[1] || m[2] || ''));
            } else {
              addOut(`[Python 3.12] Executed ${node.name} successfully.`);
            }
            addOut(`[Process finished with exit code 0]`, 'system');
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
          addOut(`▶ Running ${targetNode.name} (${lang})...`, 'info');
          if (lang === 'javascript') {
            try {
              const captured: string[] = [];
              const mockConsole = {
                log: (...a: any[]) => captured.push(a.join(' ')),
                error: (...a: any[]) => captured.push('ERROR: ' + a.join(' ')),
              };
              const fn = new Function('console', targetNode.content || '');
              const res = fn(mockConsole);
              captured.forEach((c) => addOut(c));
              if (res !== undefined) addOut(String(res), 'success');
              addOut(`[Done] exited with code 0 in 12ms`, 'system');
            } catch (err: any) {
              addOut(err.toString(), 'stderr');
            }
          } else {
            addOut(`[${lang.toUpperCase()}] Compilation and execution complete with code 0.`, 'success');
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

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeTerminalCommand(inputVal);
    setInputVal('');
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      // Autocomplete command or file
      const commands = ['help', 'ls', 'cd', 'pwd', 'cat', 'touch', 'mkdir', 'rm', 'echo', 'node', 'python', 'run', 'tree', 'git', 'clear'];
      const dirItems = getDirContents(cwd).map((n) => n.name);
      const allChoices = [...commands, ...dirItems];

      const match = allChoices.find((c) => c.startsWith(inputVal.trim()));
      if (match) {
        setInputVal(match + ' ');
      }
    }
  };

  // Build live HTML/CSS/JS preview iframe bundle
  const generatePreviewSrc = () => {
    let html = '<!DOCTYPE html><html><head><meta charset="utf-8">';
    let css = '';
    let js = '';

    const extractFiles = (nodes: FileNode[]) => {
      nodes.forEach((n) => {
        if (n.type === 'file') {
          if (n.name.endsWith('.html')) html += n.content || '';
          if (n.name.endsWith('.css')) css += n.content || '';
          if (n.name.endsWith('.js')) js += n.content || '';
        }
        if (n.children) extractFiles(n.children);
      });
    };
    extractFiles(files);

    if (!html.includes('<body') && activeFileContent) {
      html += `<body>${activeFileContent}</body>`;
    }

    return `
      ${html}
      <style>${css}</style>
      <script>
        try {
          ${js}
        } catch (err) {
          console.error("Preview Script Error:", err);
        }
      </script>
      </html>
    `;
  };

  if (!isOpen) {
    return (
      <div className={styles.collapsedBar} onClick={onToggleOpen}>
        <div className={styles.collapsedLeft}>
          <Terminal size={13} />
          <span>TERMINAL</span>
          <span className={styles.logCount}>{terminalLines.length}</span>
        </div>
        <button className={styles.expandBtn} title="Expand Terminal Panel">
          <Terminal size={14} />
        </button>
      </div>
    );
  }

  const height = isMaximized ? 380 : 210;

  return (
    <div className={styles.consolePanel} style={{ height: `${height}px` }}>
      {/* VS Code Style Header */}
      <div className={styles.header}>
        <div className={styles.tabsGroup}>
          <button
            className={`${styles.tabBtn} ${tab === 'terminal' ? styles.activeTab : ''}`}
            onClick={() => setTab('terminal')}
          >
            <Terminal size={12} />
            <span>TERMINAL</span>
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'output' ? styles.activeTab : ''}`}
            onClick={() => setTab('output')}
          >
            <FileText size={12} />
            <span>OUTPUT</span>
            {logs.length > 0 && <span className={styles.tabBadge}>{logs.length}</span>}
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'problems' ? styles.activeTab : ''}`}
            onClick={() => setTab('problems')}
          >
            <AlertCircle size={12} />
            <span>PROBLEMS</span>
            <span className={styles.tabBadge}>0</span>
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'preview' ? styles.activeTab : ''}`}
            onClick={() => setTab('preview')}
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
            onClick={() => {
              if (tab === 'terminal') {
                setTerminalLines([]);
              } else {
                onClearLogs();
              }
            }}
            title="Clear Panel"
          >
            <Trash2 size={13} />
          </button>

          <button
            className={styles.actionBtn}
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restore Panel Size' : 'Maximize Panel Size'}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
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
                      <span className={styles.promptSymbol}>$</span>
                      <span className={styles.commandText}>{line.command}</span>
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
              <form onSubmit={handleTerminalSubmit} className={styles.activeInputLine}>
                <span className={styles.promptUser}>{userName}</span>
                <span className={styles.promptColon}>:</span>
                <span className={styles.promptPath}>{cwd === '/' ? '~' : `~${cwd}`}</span>
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
              <div ref={terminalEndRef} />
            </div>
          </div>
        )}

        {/* Output Tab */}
        {tab === 'output' && (
          <div className={styles.logList}>
            {logs.length === 0 ? (
              <div className={styles.emptyLogs}>
                <span>No output yet. Click ▶ Run in the top bar to execute code.</span>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`${styles.logLine} ${styles[log.type]}`}>
                  <span className={styles.logTime}>{log.timestamp}</span>
                  <span className={styles.logPrefix}>
                    {log.type === 'stdout' && '>'}
                    {log.type === 'stderr' && '✕'}
                    {log.type === 'info' && 'ℹ'}
                    {log.type === 'system' && '⚙'}
                    {log.type === 'result' && '←'}
                  </span>
                  <pre className={styles.logText}>{log.text}</pre>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
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
            <iframe
              title="Live HTML Preview"
              sandbox="allow-scripts allow-modals"
              srcDoc={generatePreviewSrc()}
              className={styles.previewIframe}
            />
          </div>
        )}
      </div>
    </div>
  );
};
