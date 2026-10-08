import type { editor } from 'monaco-editor';

export const KOLLAB_THEME_NAME = 'kollab-obsidian';

export interface EditorThemeOption {
  id: string;
  name: string;
  type: 'dark' | 'light';
  previewColor: string;
  accentColor: string;
}

export const THEMES_LIST: EditorThemeOption[] = [
  { id: 'kollab-obsidian', name: 'Kollab Obsidian', type: 'dark', previewColor: '#07090D', accentColor: '#A78BFA' },
  { id: 'vs-dark', name: 'VS Code Dark+', type: 'dark', previewColor: '#1E1E1E', accentColor: '#007ACC' },
  { id: 'one-dark-pro', name: 'One Dark Pro', type: 'dark', previewColor: '#282C34', accentColor: '#61AFEF' },
  { id: 'dracula', name: 'Dracula', type: 'dark', previewColor: '#282A36', accentColor: '#BD93F9' },
  { id: 'monokai-pro', name: 'Monokai Pro', type: 'dark', previewColor: '#272822', accentColor: '#A6E22E' },
  { id: 'nord', name: 'Nord Arctic', type: 'dark', previewColor: '#2E3440', accentColor: '#88C0D0' },
  { id: 'github-dark', name: 'GitHub Dark', type: 'dark', previewColor: '#0D1117', accentColor: '#58A6FF' },
  { id: 'github-light', name: 'GitHub Light', type: 'light', previewColor: '#FFFFFF', accentColor: '#0969DA' },
  { id: 'synthwave-84', name: "SynthWave '84", type: 'dark', previewColor: '#262335', accentColor: '#FF7EDB' },
];

export const kollabTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'F0F3F6', background: '161B22' },
    { token: 'comment', foreground: '545D68', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'F472B6' },
    { token: 'keyword.control', foreground: 'F472B6' },
    { token: 'storage', foreground: 'C084FC' },
    { token: 'storage.type', foreground: 'C084FC' },
    { token: 'string', foreground: '4ADE80' },
    { token: 'string.html', foreground: '4ADE80' },
    { token: 'string.yaml', foreground: '4ADE80' },
    { token: 'number', foreground: 'FBBF24' },
    { token: 'constant', foreground: 'F97316' },
    { token: 'type', foreground: '2DD4BF' },
    { token: 'type.identifier', foreground: '2DD4BF' },
    { token: 'class', foreground: '2DD4BF' },
    { token: 'function', foreground: '38BDF8' },
    { token: 'identifier', foreground: 'F0F3F6' },
    { token: 'variable', foreground: 'F0F3F6' },
    { token: 'attribute.name', foreground: 'FBBF24' },
    { token: 'attribute.value', foreground: '4ADE80' },
    { token: 'tag', foreground: '38BDF8' },
    { token: 'delimiter', foreground: '8B949E' },
    { token: 'annotation', foreground: 'F97316' },
  ],
  colors: {
    'editor.background': '#07090D',
    'editor.foreground': '#F3F4F6',
    'editor.lineHighlightBackground': '#0C1017',
    'editor.lineHighlightBorder': '#0C1017',
    'editorLineNumber.foreground': '#3F4756',
    'editorLineNumber.activeForeground': '#A78BFA',
    'editorCursor.foreground': '#A78BFA',
    'editor.selectionBackground': '#222C42',
    'editor.inactiveSelectionBackground': '#182030',
    'editor.selectionHighlightBackground': '#1E273A',
    'editorIndentGuide.background': '#151A24',
    'editorIndentGuide.activeBackground': '#263044',
    'editorWhitespace.foreground': '#1C2230',
    'editorGutter.background': '#07090D',
    'scrollbarSlider.background': '#232A3855',
    'scrollbarSlider.hoverBackground': '#333D5288',
    'scrollbarSlider.activeBackground': '#45526CBB',
    'editorWidget.background': '#0E121B',
    'editorWidget.border': '#202738',
    'editorSuggestWidget.background': '#0E121B',
    'editorSuggestWidget.border': '#202738',
    'editorSuggestWidget.selectedBackground': '#232D42',
  },
};

export const oneDarkProTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'ABB2BF', background: '282C34' },
    { token: 'comment', foreground: '5C6370', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'C678DD' },
    { token: 'storage', foreground: 'C678DD' },
    { token: 'string', foreground: '98C379' },
    { token: 'number', foreground: 'D19A66' },
    { token: 'constant', foreground: 'D19A66' },
    { token: 'type', foreground: 'E5C07B' },
    { token: 'class', foreground: 'E5C07B' },
    { token: 'function', foreground: '61AFEF' },
    { token: 'variable', foreground: 'E06C75' },
    { token: 'tag', foreground: 'E06C75' },
    { token: 'delimiter', foreground: 'ABB2BF' },
  ],
  colors: {
    'editor.background': '#282C34',
    'editor.foreground': '#ABB2BF',
    'editor.lineHighlightBackground': '#2C313C',
    'editorLineNumber.foreground': '#4B5263',
    'editorLineNumber.activeForeground': '#61AFEF',
    'editorCursor.foreground': '#528BFF',
    'editor.selectionBackground': '#3E4451',
    'editor.selectionHighlightBackground': '#3A3F4B',
  },
};

export const draculaTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'F8F8F2', background: '282A36' },
    { token: 'comment', foreground: '6272A4', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'FF79C6' },
    { token: 'storage', foreground: 'FF79C6' },
    { token: 'string', foreground: 'F1FA8C' },
    { token: 'number', foreground: 'BD93F9' },
    { token: 'constant', foreground: 'BD93F9' },
    { token: 'type', foreground: '8BE9FD' },
    { token: 'class', foreground: '8BE9FD' },
    { token: 'function', foreground: '50FA7B' },
    { token: 'variable', foreground: 'F8F8F2' },
    { token: 'tag', foreground: 'FF79C6' },
  ],
  colors: {
    'editor.background': '#282A36',
    'editor.foreground': '#F8F8F2',
    'editor.lineHighlightBackground': '#44475A77',
    'editorLineNumber.foreground': '#6272A4',
    'editorLineNumber.activeForeground': '#F1FA8C',
    'editorCursor.foreground': '#AEAFAD',
    'editor.selectionBackground': '#44475A',
  },
};

export const monokaiTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'F8F8F2', background: '272822' },
    { token: 'comment', foreground: '75715E', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'F92672' },
    { token: 'storage', foreground: '66D9EF' },
    { token: 'string', foreground: 'E6DB74' },
    { token: 'number', foreground: 'AE81FF' },
    { token: 'constant', foreground: 'AE81FF' },
    { token: 'type', foreground: '66D9EF' },
    { token: 'class', foreground: 'A6E22E' },
    { token: 'function', foreground: 'A6E22E' },
    { token: 'variable', foreground: 'F8F8F2' },
    { token: 'tag', foreground: 'F92672' },
  ],
  colors: {
    'editor.background': '#272822',
    'editor.foreground': '#F8F8F2',
    'editor.lineHighlightBackground': '#3E3D32',
    'editorLineNumber.foreground': '#90908A',
    'editorLineNumber.activeForeground': '#F8F8F2',
    'editorCursor.foreground': '#F8F8F0',
    'editor.selectionBackground': '#49483E',
  },
};

export const nordTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'D8DEE9', background: '2E3440' },
    { token: 'comment', foreground: '616E88', fontStyle: 'italic' },
    { token: 'keyword', foreground: '81A1C1' },
    { token: 'storage', foreground: '81A1C1' },
    { token: 'string', foreground: 'A3BE8C' },
    { token: 'number', foreground: 'B48EAD' },
    { token: 'constant', foreground: 'B48EAD' },
    { token: 'type', foreground: '8FBCBB' },
    { token: 'class', foreground: '8FBCBB' },
    { token: 'function', foreground: '88C0D0' },
    { token: 'variable', foreground: 'D8DEE9' },
    { token: 'tag', foreground: '81A1C1' },
  ],
  colors: {
    'editor.background': '#2E3440',
    'editor.foreground': '#D8DEE9',
    'editor.lineHighlightBackground': '#3B4252',
    'editorLineNumber.foreground': '#4C566A',
    'editorLineNumber.activeForeground': '#88C0D0',
    'editorCursor.foreground': '#D8DEE9',
    'editor.selectionBackground': '#434C5E',
  },
};

export const githubDarkTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'C9D1D9', background: '0D1117' },
    { token: 'comment', foreground: '8B949E', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'FF7B72' },
    { token: 'storage', foreground: 'FF7B72' },
    { token: 'string', foreground: 'A5D6FF' },
    { token: 'number', foreground: '79C0FF' },
    { token: 'constant', foreground: '79C0FF' },
    { token: 'type', foreground: 'FFA657' },
    { token: 'class', foreground: 'FFA657' },
    { token: 'function', foreground: 'D2A8FF' },
    { token: 'variable', foreground: 'C9D1D9' },
    { token: 'tag', foreground: '7EE787' },
  ],
  colors: {
    'editor.background': '#0D1117',
    'editor.foreground': '#C9D1D9',
    'editor.lineHighlightBackground': '#161B22',
    'editorLineNumber.foreground': '#6E7681',
    'editorLineNumber.activeForeground': '#58A6FF',
    'editorCursor.foreground': '#58A6FF',
    'editor.selectionBackground': '#1F6FEB44',
  },
};

export const githubLightTheme: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: '', foreground: '24292F', background: 'FFFFFF' },
    { token: 'comment', foreground: '6E7781', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'CF222E' },
    { token: 'storage', foreground: 'CF222E' },
    { token: 'string', foreground: '0A3069' },
    { token: 'number', foreground: '0550AE' },
    { token: 'constant', foreground: '0550AE' },
    { token: 'type', foreground: '953800' },
    { token: 'class', foreground: '953800' },
    { token: 'function', foreground: '8250DF' },
    { token: 'variable', foreground: '24292F' },
    { token: 'tag', foreground: '116329' },
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#24292F',
    'editor.lineHighlightBackground': '#F6F8FA',
    'editorLineNumber.foreground': '#8C959F',
    'editorLineNumber.activeForeground': '#0969DA',
    'editorCursor.foreground': '#0969DA',
    'editor.selectionBackground': '#B6E3FF88',
  },
};

export const synthwaveTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'F92AAD', background: '262335' },
    { token: 'comment', foreground: '614D85', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'FEDE5D' },
    { token: 'storage', foreground: 'FEDE5D' },
    { token: 'string', foreground: 'FF8B39' },
    { token: 'number', foreground: '36F9F6' },
    { token: 'constant', foreground: '36F9F6' },
    { token: 'type', foreground: 'FE4450' },
    { token: 'class', foreground: 'FE4450' },
    { token: 'function', foreground: '36F9F6' },
    { token: 'variable', foreground: 'FFFFFF' },
    { token: 'tag', foreground: '72F1B8' },
  ],
  colors: {
    'editor.background': '#262335',
    'editor.foreground': '#FFFFFF',
    'editor.lineHighlightBackground': '#342E4F',
    'editorLineNumber.foreground': '#848BB2',
    'editorLineNumber.activeForeground': '#FEDE5D',
    'editorCursor.foreground': '#FF7EDB',
    'editor.selectionBackground': '#614D8577',
  },
};

export function registerAllThemes(m: typeof import('monaco-editor')) {
  m.editor.defineTheme('kollab-obsidian', kollabTheme);
  m.editor.defineTheme('ceditor-slate', kollabTheme); // backwards compatibility
  m.editor.defineTheme('one-dark-pro', oneDarkProTheme);
  m.editor.defineTheme('dracula', draculaTheme);
  m.editor.defineTheme('monokai-pro', monokaiTheme);
  m.editor.defineTheme('nord', nordTheme);
  m.editor.defineTheme('github-dark', githubDarkTheme);
  m.editor.defineTheme('github-light', githubLightTheme);
  m.editor.defineTheme('synthwave-84', synthwaveTheme);
}

// Auto-register on import with monaco-editor
import * as monaco from 'monaco-editor';
registerAllThemes(monaco);

export function applyEditorTheme(themeId: string) {
  try {
    monaco.editor.setTheme(themeId);
  } catch (err) {
    console.warn('Failed to apply editor theme:', err);
  }
}
