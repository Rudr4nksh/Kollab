import React, { useRef, useState, useEffect } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { KOLLAB_THEME_NAME, kollabTheme } from './monacoTheme.ts';
import type { SupportedLanguage, Participant } from '../../types/index.ts';
import styles from './CodeEditor.module.css';

interface CodeEditorProps {
  value?: string;
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
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  language,
  onLanguageChange,
  onContentChange,
  onCursorChange,
  onSelectionChange,
  onEditorMount,
  participants = [],
  currentUserId,
  readOnly = false,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [lineCount, setLineCount] = useState(1);

  const handleEditorDidMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;

    // Define custom theme
    monaco.editor.defineTheme(KOLLAB_THEME_NAME, kollabTheme);
    monaco.editor.setTheme(KOLLAB_THEME_NAME);

    // Initial stats
    setLineCount(ed.getModel()?.getLineCount() || 1);

    // Track cursor and selection changes
    ed.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, column: e.position.column });
      if (onCursorChange) {
        onCursorChange(e.position.lineNumber, e.position.column);
      }
    });

    ed.onDidChangeCursorSelection((e) => {
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
      if (onContentChange) {
        onContentChange(ed.getValue());
      }
    });

    if (onEditorMount) {
      onEditorMount(ed, monaco);
    }
  };

  // Render remote participant line highlights & decorations
  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) return;

    const newDecorations: editor.IModelDeltaDecoration[] = [];

    participants.forEach((p) => {
      if (p.id === currentUserId) return; // Don't decorate own cursor

      if (p.currentLine && p.currentLine > 0) {
        // Subtle line highlight
        newDecorations.push({
          range: new monaco.Range(p.currentLine, 1, p.currentLine, 1),
          options: {
            isWholeLine: true,
            className: `remote-line-highlight remote-user-${p.id.replace(/[^a-zA-Z0-9]/g, '')}`,
            overviewRuler: {
              color: p.color,
              position: monaco.editor.OverviewRulerLane.Left,
            },
          },
        });
      }
    });

    decorationsRef.current = ed.deltaDecorations(decorationsRef.current, newDecorations);
  }, [participants, currentUserId]);

  return (
    <div className={styles.editorContainer}>
      <div className={styles.editorFrame}>
        <MonacoEditor
          height="100%"
          language={language}
          value={value}
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
            padding: { top: 10, bottom: 10 },
          }}
        />
      </div>

      {/* Modern micro status bar */}
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
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="dart">Dart</option>
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
