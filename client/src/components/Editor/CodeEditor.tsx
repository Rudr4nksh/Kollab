import React, { useRef, useState, useEffect } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { KOLLAB_THEME_NAME, kollabTheme } from './monacoTheme.ts';
import { registerLanguageCompletions } from './languageCompletions.ts';
import type { SupportedLanguage, Participant } from '../../types/index.ts';
import styles from './CodeEditor.module.css';

interface CodeEditorProps {
  value?: string;
  filePath?: string;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onContentChange?: (val: string) => void;
  onCursorChange?: (line: number, column: number) => void;
  onSelectionChange?: (range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  }) => void;
  onEditorMount?: (editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => void;
  participants?: Participant[];
  currentUserId?: string;
  readOnly?: boolean;
  onUndoFile?: () => void;
  onRedoFile?: () => void;
}

interface RemoteWidgetEntry {
  widget: editor.IContentWidget;
  containerNode: HTMLElement;
  caretNode: HTMLElement;
  tagNode: HTMLElement;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  filePath,
  language,
  onLanguageChange,
  onContentChange,
  onCursorChange,
  onSelectionChange,
  onEditorMount,
  participants = [],
  currentUserId,
  readOnly = false,
  onUndoFile,
  onRedoFile,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const widgetsMapRef = useRef<Map<string, RemoteWidgetEntry>>(new Map());
  const isApplyingRemoteRef = useRef<boolean>(false);
  const prevFilePathRef = useRef<string | undefined>(filePath);
  const onUndoFileRef = useRef(onUndoFile);
  const onRedoFileRef = useRef(onRedoFile);

  useEffect(() => {
    onUndoFileRef.current = onUndoFile;
    onRedoFileRef.current = onRedoFile;
  }, [onUndoFile, onRedoFile]);

  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [lineCount, setLineCount] = useState(1);

  const handleEditorDidMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;

    // Define custom obsidian theme
    monaco.editor.defineTheme(KOLLAB_THEME_NAME, kollabTheme);
    monaco.editor.setTheme(KOLLAB_THEME_NAME);

    // Register rich language autocompletions & snippets for C++, Python, Java, Dart, HTML, CSS, JS, etc.
    registerLanguageCompletions(monaco);

    // Initial stats
    setLineCount(ed.getModel()?.getLineCount() || 1);

    // Track cursor and selection changes
    ed.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, column: e.position.column });
      // When remote updates are being applied, do NOT broadcast internal cursor shifts back to peers!
      if (isApplyingRemoteRef.current) {
        return;
      }
      if (onCursorChange) {
        onCursorChange(e.position.lineNumber, e.position.column);
      }
    });

    ed.onDidChangeCursorSelection((e) => {
      if (isApplyingRemoteRef.current) {
        return;
      }
      if (onSelectionChange) {
        onSelectionChange({
          startLineNumber: e.selection.startLineNumber,
          startColumn: e.selection.startColumn,
          endLineNumber: e.selection.endLineNumber,
          endColumn: e.selection.endColumn,
        });
      }
    });

    ed.onDidChangeModelContent(() => {
      setLineCount(ed.getModel()?.getLineCount() || 1);
      // If the content change was caused by a remote socket update, don't re-emit
      if (isApplyingRemoteRef.current) {
        return;
      }
      if (onContentChange) {
        onContentChange(ed.getValue());
      }
    });

    // Check whether Monaco has pending text undo/redo actions
    const monacoCanUndo = () => {
      const model = ed.getModel() as any;
      if (!model) return false;
      return typeof model.canUndo === 'function' ? model.canUndo() : false;
    };

    const monacoCanRedo = () => {
      const model = ed.getModel() as any;
      if (!model) return false;
      return typeof model.canRedo === 'function' ? model.canRedo() : false;
    };

    // 1. Monaco command layer (invoked when Monaco command service resolves shortcuts)
    const handleMonacoUndo = () => {
      if (monacoCanUndo()) {
        ed.trigger('keyboard', 'undo', null);
      } else if (onUndoFileRef.current) {
        onUndoFileRef.current();
      }
    };

    const handleMonacoRedo = () => {
      if (monacoCanRedo()) {
        ed.trigger('keyboard', 'redo', null);
      } else if (onRedoFileRef.current) {
        onRedoFileRef.current();
      }
    };

    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, handleMonacoUndo);
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, handleMonacoRedo);
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, handleMonacoRedo);

    // 2. Editor keydown event listener (intercepts before Monaco built-in commands swallow the keypress)
    ed.onKeyDown((e) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      const key = e.browserEvent?.key?.toLowerCase();
      const isZ = e.keyCode === monaco.KeyCode.KeyZ || e.code === 'KeyZ' || key === 'z';
      const isY = e.keyCode === monaco.KeyCode.KeyY || e.code === 'KeyY' || key === 'y';

      if (isZ && !e.shiftKey) {
        if (!monacoCanUndo() && onUndoFileRef.current) {
          e.preventDefault();
          e.stopPropagation();
          e.browserEvent?.preventDefault();
          e.browserEvent?.stopPropagation();
          onUndoFileRef.current();
        }
      } else if ((isZ && e.shiftKey) || isY) {
        if (!monacoCanRedo() && onRedoFileRef.current) {
          e.preventDefault();
          e.stopPropagation();
          e.browserEvent?.preventDefault();
          e.browserEvent?.stopPropagation();
          onRedoFileRef.current();
        }
      }
    });

    if (onEditorMount) {
      onEditorMount(ed, monaco);
    }
  };

  // Synchronize file path changes (switching tabs)
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (prevFilePathRef.current !== filePath) {
      prevFilePathRef.current = filePath;
      isApplyingRemoteRef.current = true;
      ed.setValue(value || '');
      ed.setPosition({ lineNumber: 1, column: 1 });
      setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 50);
      setLineCount(ed.getModel()?.getLineCount() || 1);
    }
  }, [filePath, value]);

  // Synchronize remote content updates cleanly without cursor resets or echo loops
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || value === undefined) return;
    // Only apply if file paths match and content differs
    if (prevFilePathRef.current === filePath && value !== ed.getValue()) {
      const model = ed.getModel();
      if (!model) return;

      const selections = ed.getSelections();
      isApplyingRemoteRef.current = true;

      ed.executeEdits('remote-sync', [
        {
          range: model.getFullModelRange(),
          text: value,
          forceMoveMarkers: false,
        },
      ]);

      if (selections && selections.length > 0) {
        ed.setSelections(selections);
      }

      // Keep flag true long enough to discard Monaco's internal deferred cursor events
      setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 80);

      setLineCount(model.getLineCount());
    }
  }, [value, filePath]);

  // Render high-visibility remote cursors (Monaco IContentWidget) and line highlights
  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) return;

    const activeParticipantIds = new Set<string>();

    participants.forEach((p) => {
      // Don't render cursor for self
      if (p.id === currentUserId) return;

      // Only show remote cursor if the peer is active on the same file
      if (p.activeFilePath && filePath && p.activeFilePath !== filePath) {
        return;
      }

      const targetLine = p.cursor?.line || p.currentLine;
      const targetCol = p.cursor?.column || 1;

      if (!targetLine || targetLine < 1) return;

      activeParticipantIds.add(p.id);

      // On line 1, display tag below the line (top: 22px) so it is never hidden behind the tab bar
      const isFirstLine = targetLine <= 1;
      const tagTop = isFirstLine ? '22px' : '-19px';
      const tagRadius = isFirstLine ? '0 3px 3px 3px' : '3px 3px 3px 0';

      const existing = widgetsMapRef.current.get(p.id);
      if (existing) {
        // Update widget position dynamically
        existing.widget.getPosition = () => ({
          position: { lineNumber: targetLine, column: targetCol },
          preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
        });
        existing.tagNode.textContent = p.name;
        existing.tagNode.style.backgroundColor = p.color;
        existing.tagNode.style.top = tagTop;
        existing.tagNode.style.borderRadius = tagRadius;
        existing.caretNode.style.backgroundColor = p.color;
        existing.caretNode.style.boxShadow = `0 0 6px ${p.color}`;

        ed.layoutContentWidget(existing.widget);
      } else {
        // Build new ContentWidget DOM
        const container = document.createElement('div');
        container.className = 'remote-cursor-container';

        const caret = document.createElement('div');
        caret.className = 'remote-caret-bar';
        caret.style.backgroundColor = p.color;
        caret.style.boxShadow = `0 0 6px ${p.color}`;

        const tag = document.createElement('div');
        tag.className = 'remote-name-tag';
        tag.textContent = p.name;
        tag.style.backgroundColor = p.color;
        tag.style.top = tagTop;
        tag.style.borderRadius = tagRadius;

        container.appendChild(caret);
        container.appendChild(tag);

        const widget: editor.IContentWidget = {
          getId: () => `cursor_widget_${p.id}`,
          getDomNode: () => container,
          getPosition: () => ({
            position: { lineNumber: targetLine, column: targetCol },
            preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
          }),
        };

        ed.addContentWidget(widget);
        widgetsMapRef.current.set(p.id, {
          widget,
          containerNode: container,
          caretNode: caret,
          tagNode: tag,
        });
      }
    });

    // Remove widgets for peers that disconnected or switched files
    widgetsMapRef.current.forEach((entry, id) => {
      if (!activeParticipantIds.has(id)) {
        ed.removeContentWidget(entry.widget);
        widgetsMapRef.current.delete(id);
      }
    });

    // Model delta decorations for subtle active line highlight & multi-char selection
    const newDecorations: editor.IModelDeltaDecoration[] = [];

    participants.forEach((p) => {
      if (p.id === currentUserId) return;
      if (p.activeFilePath && filePath && p.activeFilePath !== filePath) return;

      const targetLine = p.cursor?.line || p.currentLine;
      if (targetLine && targetLine > 0) {
        newDecorations.push({
          range: new monaco.Range(targetLine, 1, targetLine, 1),
          options: {
            isWholeLine: true,
            className: 'remote-line-highlight',
            overviewRuler: {
              color: p.color,
              position: monaco.editor.OverviewRulerLane.Left,
            },
          },
        });
      }

      if (
        p.selection &&
        (p.selection.startLineNumber !== p.selection.endLineNumber ||
          p.selection.startColumn !== p.selection.endColumn)
      ) {
        newDecorations.push({
          range: new monaco.Range(
            p.selection.startLineNumber,
            p.selection.startColumn,
            p.selection.endLineNumber,
            p.selection.endColumn
          ),
          options: {
            className: 'remote-selection',
          },
        });
      }
    });

    decorationsRef.current = ed.deltaDecorations(decorationsRef.current, newDecorations);
  }, [participants, currentUserId, filePath]);

  // Clean up all content widgets on unmount
  useEffect(() => {
    return () => {
      const ed = editorRef.current;
      if (ed) {
        widgetsMapRef.current.forEach((entry) => {
          ed.removeContentWidget(entry.widget);
        });
        widgetsMapRef.current.clear();
      }
    };
  }, []);

  return (
    <div className={styles.editorContainer}>
      <div className={styles.editorFrame}>
        <MonacoEditor
          height="100%"
          language={language}
          defaultValue={value}
          theme={KOLLAB_THEME_NAME}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            fontSize: 13.5,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', monospace",
            fontLigatures: true,
            lineHeight: 22,
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderLineHighlight: 'line',
            renderWhitespace: 'selection',
            minimap: {
              enabled: false,
            },
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              useShadows: false,
            },
            tabSize: 2,
            wordWrap: 'on',
            automaticLayout: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true,
            },
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: 'allDocuments',
            suggest: {
              showWords: true,
              showSnippets: true,
              showKeywords: true,
              showFunctions: true,
              showClasses: true,
              showVariables: true,
              showModules: true,
              showConstructors: true,
              showFields: true,
              showMethods: true,
              showProperties: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              preview: true,
              insertMode: 'insert',
            },
            padding: { top: 20, bottom: 14 },
          }}
        />
      </div>

      {/* Micro status bar */}
      <footer className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.statusItem}>UTF-8</span>
          <span className={styles.statusDivider}>•</span>
          {onLanguageChange ? (
            <select
              className={styles.statusLangSelect}
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
              title="Change language mode"
            >
              <option value="javascript">JavaScript (JS / JSX)</option>
              <option value="typescript">TypeScript (TS / TSX)</option>
              <option value="html">HTML5</option>
              <option value="css">CSS3</option>
              <option value="scss">SCSS / SASS</option>
              <option value="json">JSON</option>
              <option value="yaml">YAML</option>
              <option value="xml">XML / SVG</option>
              <option value="php">PHP</option>
              <option value="ruby">Ruby</option>
              <option value="graphql">GraphQL</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="rust">Rust</option>
              <option value="go">Go</option>
              <option value="kotlin">Kotlin</option>
              <option value="csharp">C# (.NET)</option>
              <option value="swift">Swift</option>
              <option value="dart">Dart (Flutter)</option>
              <option value="python">Python (AI / ML / Data)</option>
              <option value="r">R (Statistics / Data)</option>
              <option value="julia">Julia (Scientific ML)</option>
              <option value="sql">SQL</option>
              <option value="shell">Shell / Bash</option>
              <option value="markdown">Markdown</option>
              <option value="dockerfile">Dockerfile</option>
              <option value="plaintext">Plaintext</option>
            </select>
          ) : (
            <span className={styles.statusLangBadge}>{language.toUpperCase()}</span>
          )}
          {readOnly && (
            <>
              <span className={styles.statusDivider}>•</span>
              <span className={styles.statusItem}>Read-Only</span>
            </>
          )}
        </div>
        <div className={styles.statusRight}>
          <span className={styles.statusItem}>
            Ln {cursorPos.line}, Col {cursorPos.column}
          </span>
          <span className={styles.statusDivider}>•</span>
          <span className={styles.statusItem}>
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>
      </footer>
    </div>
  );
};
