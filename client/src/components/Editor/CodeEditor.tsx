import React, { useRef, useState, useEffect } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Palette, Code2, Search, Check } from 'lucide-react';
import { KOLLAB_THEME_NAME, registerAllThemes, THEMES_LIST, applyEditorTheme } from './monacoTheme.ts';
import { registerLanguageCompletions } from './languageCompletions.ts';
import {
  LANGUAGE_METAS,
  getLanguageMeta,
  getMonacoLanguageId,
} from '../../services/languageExtensions.ts';
import type { SupportedLanguage, Participant } from '../../types/index.ts';
import styles from './CodeEditor.module.css';

interface CodeEditorProps {
  value?: string;
  filePath?: string;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage, newFilename?: string) => void;
  theme?: string;
  onThemeChange?: (themeId: string) => void;
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
  theme,
  onThemeChange,
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
  const widgetsMapRef = useRef<Map<string, RemoteWidgetEntry>>(new Map());
  const isApplyingRemoteRef = useRef<boolean>(false);
  const prevFilePathRef = useRef<string | undefined>(filePath);

  // Per-file Monaco ITextModel cache to preserve undo/redo history, view state, and cursor across tabs
  const modelsMapRef = useRef<Map<string, editor.ITextModel>>(new Map());

  // Themes state
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    return theme || localStorage.getItem('kollab-editor-theme') || KOLLAB_THEME_NAME;
  });
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  // Sync theme changes from parent or prop
  useEffect(() => {
    if (theme && theme !== currentTheme) {
      setCurrentTheme(theme);
      applyEditorTheme(theme);
      if (monacoRef.current) {
        monacoRef.current.editor.setTheme(theme);
      }
    }
  }, [theme, currentTheme]);

  // Language & extension picker state
  const [isLangPickerOpen, setIsLangPickerOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');

  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [lineCount, setLineCount] = useState(1);

  const currentLangMeta = getLanguageMeta(language);

  const handleEditorDidMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;

    // Register all custom themes
    registerAllThemes(monaco);
    monaco.editor.setTheme(currentTheme);

    // Register rich language autocompletions & snippets for all supported languages
    registerLanguageCompletions(monaco);

    // Initial model setup for starting file
    if (filePath) {
      const monacoLang = getMonacoLanguageId(language);
      const uri = monaco.Uri.parse(`inmemory://kollab/${encodeURIComponent(filePath)}`);
      let model = monaco.editor.getModel(uri);
      if (!model || model.isDisposed()) {
        model = monaco.editor.createModel(value || '', monacoLang, uri);
      }
      modelsMapRef.current.set(filePath, model);
      ed.setModel(model);
      setLineCount(model.getLineCount());
    }

    // Track cursor and selection changes
    ed.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, column: e.position.column });
      if (isApplyingRemoteRef.current) return;
      if (onCursorChange) {
        onCursorChange(e.position.lineNumber, e.position.column);
      }
    });

    ed.onDidChangeCursorSelection((e) => {
      if (isApplyingRemoteRef.current) return;
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
      const model = ed.getModel();
      setLineCount(model?.getLineCount() || 1);
      if (isApplyingRemoteRef.current) return;
      if (onContentChange && model) {
        onContentChange(model.getValue());
      }
    });

    if (onEditorMount) {
      onEditorMount(ed, monaco);
    }
  };

  // Synchronize file path changes (switching tabs) without losing undo history
  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco || !filePath) return;

    if (prevFilePathRef.current !== filePath) {
      prevFilePathRef.current = filePath;
      const monacoLang = getMonacoLanguageId(language);
      const uri = monaco.Uri.parse(`inmemory://kollab/${encodeURIComponent(filePath)}`);

      let model = modelsMapRef.current.get(filePath);
      if (!model || model.isDisposed()) {
        const existing = monaco.editor.getModel(uri);
        if (existing && !existing.isDisposed()) {
          model = existing;
        } else {
          model = monaco.editor.createModel(value || '', monacoLang, uri);
        }
        modelsMapRef.current.set(filePath, model);
      }

      // Switch to file model
      if (ed.getModel() !== model) {
        isApplyingRemoteRef.current = true;
        ed.setModel(model);
        if (value !== undefined && model.getValue() !== value) {
          model.setValue(value);
        }
        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 50);
      }

      setLineCount(model.getLineCount());
    }
  }, [filePath, value, language]);

  // Synchronize language changes on the active Monaco model
  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) return;
    const model = ed.getModel();
    if (model) {
      const monacoLang = getMonacoLanguageId(language);
      if (model.getLanguageId() !== monacoLang) {
        monaco.editor.setModelLanguage(model, monacoLang);
      }
    }
  }, [language]);

  // Synchronize remote content updates cleanly without cursor resets or echo loops
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || value === undefined) return;
    if (prevFilePathRef.current === filePath) {
      const model = ed.getModel();
      if (!model) return;

      if (value !== model.getValue()) {
        const selections = ed.getSelections();
        isApplyingRemoteRef.current = true;

        model.pushEditOperations(
          [],
          [
            {
              range: model.getFullModelRange(),
              text: value,
              forceMoveMarkers: true,
            },
          ],
          () => null
        );

        if (selections && selections.length > 0) {
          ed.setSelections(selections);
        }

        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 60);

        setLineCount(model.getLineCount());
      }
    }
  }, [value, filePath]);

  // Render high-visibility remote cursors (Monaco IContentWidget) and line highlights
  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) return;

    const activeParticipantIds = new Set<string>();

    participants.forEach((p) => {
      if (p.id === currentUserId) return;
      if (p.activeFilePath && filePath && p.activeFilePath !== filePath) return;
      if (p.cursor) {
        activeParticipantIds.add(p.id);
      }
    });

    const newDecorations: editor.IModelDeltaDecoration[] = [];

    participants.forEach((p) => {
      if (p.id === currentUserId) return;
      if (p.activeFilePath && filePath && p.activeFilePath !== filePath) return;

      const userColor = p.color || '#7357E8';

      if (p.currentLine && p.currentLine > 0) {
        newDecorations.push({
          range: new monaco.Range(p.currentLine, 1, p.currentLine, 1),
          options: {
            isWholeLine: true,
            className: 'remote-line-highlight',
          },
        });
      }

      if (p.selection) {
        const { startLineNumber, startColumn, endLineNumber, endColumn } = p.selection;
        if (
          startLineNumber !== endLineNumber ||
          startColumn !== endColumn
        ) {
          newDecorations.push({
            range: new monaco.Range(startLineNumber, startColumn, endLineNumber, endColumn),
            options: {
              className: 'remote-selection',
              hoverMessage: { value: `**${p.name}** is selecting here` },
            },
          });
        }
      }

      if (p.cursor) {
        const { line, column } = p.cursor;
        let entry = widgetsMapRef.current.get(p.id);

        if (!entry) {
          const container = document.createElement('div');
          container.className = 'remote-cursor-container';

          const caret = document.createElement('div');
          caret.className = 'remote-caret-bar';
          caret.style.backgroundColor = userColor;

          const tag = document.createElement('div');
          tag.className = 'remote-name-tag';
          tag.style.backgroundColor = userColor;
          tag.textContent = p.name;

          container.appendChild(caret);
          container.appendChild(tag);

          const widget: editor.IContentWidget = {
            getId: () => `remote.cursor.${p.id}`,
            getDomNode: () => container,
            getPosition: () => ({
              position: { lineNumber: line, column },
              preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
            }),
          };

          ed.addContentWidget(widget);
          entry = { widget, containerNode: container, caretNode: caret, tagNode: tag };
          widgetsMapRef.current.set(p.id, entry);
        } else {
          entry.caretNode.style.backgroundColor = userColor;
          entry.tagNode.style.backgroundColor = userColor;
          entry.tagNode.textContent = p.name;

          entry.widget.getPosition = () => ({
            position: { lineNumber: line, column },
            preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
          });
          ed.layoutContentWidget(entry.widget);
        }
      }
    });

    decorationsRef.current = ed.deltaDecorations(decorationsRef.current, newDecorations);

    widgetsMapRef.current.forEach((entry, peerId) => {
      if (!activeParticipantIds.has(peerId)) {
        ed.removeContentWidget(entry.widget);
        widgetsMapRef.current.delete(peerId);
      }
    });
  }, [participants, currentUserId, filePath]);

  // Clean up all content widgets on unmount
  useEffect(() => {
    return () => {
      const ed = editorRef.current;
      if (ed) {
        widgetsMapRef.current.forEach((entry) => {
          ed.removeContentWidget(entry.widget);
        });
      }
      widgetsMapRef.current.clear();
    };
  }, []);

  const handleSelectTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('kollab-editor-theme', themeId);
    applyEditorTheme(themeId);
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(themeId);
    }
    onThemeChange?.(themeId);
    setIsThemePickerOpen(false);
  };

  const handleSelectLanguage = (meta: typeof LANGUAGE_METAS[0]) => {
    setIsLangPickerOpen(false);
    // If the file currently has an extension, propose updating the extension
    let newFilename: string | undefined = undefined;
    if (filePath) {
      const parts = filePath.split('/');
      const currentName = parts[parts.length - 1];
      const dotIndex = currentName.lastIndexOf('.');
      if (dotIndex !== -1) {
        const base = currentName.substring(0, dotIndex);
        newFilename = `${base}${meta.primaryExt}`;
      }
    }
    onLanguageChange(meta.id, newFilename);
  };

  const filteredLanguages = LANGUAGE_METAS.filter(
    (m) =>
      m.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(langSearch.toLowerCase()) ||
      m.extensions.some((ext) => ext.toLowerCase().includes(langSearch.toLowerCase()))
  );

  return (
    <div className={styles.editorContainer}>
      <div className={styles.editorFrame}>
        <MonacoEditor
          height="100%"
          language={getMonacoLanguageId(language)}
          theme={currentTheme}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderLineHighlight: 'all',
            automaticLayout: true,
            quickSuggestions: { other: true, comments: false, strings: true },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            parameterHints: { enabled: true },
            bracketPairColorization: { enabled: true },
            matchBrackets: 'always',
            contextmenu: true,
            formatOnPaste: false,
            formatOnType: false,
            renderWhitespace: 'selection',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
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
            padding: { top: 16, bottom: 14 },
          }}
        />
      </div>

      {/* Popovers Backdrop */}
      {(isThemePickerOpen || isLangPickerOpen) && (
        <div
          className={styles.popoverBackdrop}
          onClick={() => {
            setIsThemePickerOpen(false);
            setIsLangPickerOpen(false);
          }}
        />
      )}

      {/* Theme Picker Popover */}
      {isThemePickerOpen && (
        <div className={`${styles.pickerPopover} ${styles.themePickerPopover}`}>
          <div className={styles.pickerHeader}>
            <Palette size={13} style={{ color: '#A78BFA' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#F3F4F6' }}>Select Editor Theme</span>
          </div>
          <div className={styles.pickerList}>
            {THEMES_LIST.map((th) => (
              <button
                key={th.id}
                className={`${styles.pickerItem} ${currentTheme === th.id ? styles.selected : ''}`}
                onClick={() => handleSelectTheme(th.id)}
              >
                <div className={styles.itemMain}>
                  <span
                    className={styles.themeSwatch}
                    style={{ backgroundColor: th.previewColor, borderColor: th.accentColor }}
                  />
                  <span className={styles.itemLabel}>{th.name}</span>
                </div>
                {currentTheme === th.id && <Check size={13} style={{ color: th.accentColor }} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Language & Extension Picker Popover */}
      {isLangPickerOpen && (
        <div className={styles.pickerPopover}>
          <div className={styles.pickerHeader}>
            <Search size={13} style={{ color: '#717888' }} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search coding language or extension (.py, .cpp, .rs)..."
              value={langSearch}
              onChange={(e) => setLangSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className={styles.pickerList}>
            {filteredLanguages.map((meta) => {
              const isSelected = language === meta.id;
              return (
                <button
                  key={meta.id}
                  className={`${styles.pickerItem} ${isSelected ? styles.selected : ''}`}
                  onClick={() => handleSelectLanguage(meta)}
                >
                  <div className={styles.itemMain}>
                    <Code2 size={13} style={{ color: isSelected ? '#A78BFA' : '#717888' }} />
                    <span className={styles.itemLabel}>{meta.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={styles.itemExt}>{meta.primaryExt}</span>
                    {isSelected && <Check size={12} style={{ color: '#A78BFA' }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Micro status bar with interactive Theme & Extension buttons */}
      <footer className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.statusItem}>UTF-8</span>
          <span className={styles.statusDivider}>•</span>

          {/* Interactive Language & Extension Selector */}
          <button
            className={`${styles.statusInteractiveBtn} ${isLangPickerOpen ? styles.active : ''}`}
            onClick={() => {
              setIsLangPickerOpen(!isLangPickerOpen);
              setIsThemePickerOpen(false);
            }}
            title="Click to select language mode or switch extension"
          >
            <Code2 size={11} style={{ color: '#A78BFA' }} />
            <span>{currentLangMeta.name} ({currentLangMeta.primaryExt})</span>
          </button>

          <span className={styles.statusDivider}>•</span>

          {/* Interactive Themes Selector */}
          <button
            className={`${styles.statusInteractiveBtn} ${isThemePickerOpen ? styles.active : ''}`}
            onClick={() => {
              setIsThemePickerOpen(!isThemePickerOpen);
              setIsLangPickerOpen(false);
            }}
            title="Switch editor syntax color theme"
          >
            <Palette size={11} style={{ color: '#67E8F9' }} />
            <span>{THEMES_LIST.find((t) => t.id === currentTheme)?.name || 'Theme'}</span>
          </button>

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
