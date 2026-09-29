import type { editor } from 'monaco-editor';

export const KOLLAB_THEME_NAME = 'kollab-dark';

export const kollabTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'F2F2F5', background: '0E0F16' },
    { token: 'comment', foreground: '5C5E6E', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'A78BFA' }, // Soft violet/purple
    { token: 'keyword.control', foreground: 'A78BFA' },
    { token: 'string', foreground: '4ADE80' }, // Soft green
    { token: 'string.html', foreground: '4ADE80' },
    { token: 'number', foreground: 'FBBF24' }, // Warm amber
    { token: 'regexp', foreground: 'F472B6' },
    { token: 'type', foreground: '38BDF8' }, // Sky cyan
    { token: 'class', foreground: '38BDF8' },
    { token: 'function', foreground: '60A5FA' },
    { token: 'variable', foreground: 'F2F2F5' },
    { token: 'variable.predefined', foreground: 'C084FC' },
    { token: 'tag', foreground: 'B49BFF' }, // Tag purple
    { token: 'tag.id', foreground: '38BDF8' },
    { token: 'tag.class', foreground: 'FBBF24' },
    { token: 'attribute.name', foreground: 'FBBF24' },
    { token: 'attribute.value', foreground: '4ADE80' },
    { token: 'delimiter', foreground: '818496' },
    { token: 'delimiter.html', foreground: '6D4AFF' },
  ],
  colors: {
    'editor.background': '#0E0F16',
    'editor.foreground': '#F2F2F5',
    'editor.lineHighlightBackground': '#14151F',
    'editor.lineHighlightBorder': '#1F212E',
    'editorLineNumber.foreground': '#414457',
    'editorLineNumber.activeForeground': '#9B82F3',
    'editorCursor.foreground': '#B49BFF',
    'editor.selectionBackground': '#2A2548',
    'editor.inactiveSelectionBackground': '#1E1D33',
    'editor.selectionHighlightBackground': '#24213D',
    'editorIndentGuide.background': '#191B26',
    'editorIndentGuide.activeBackground': '#2D3044',
    'editorWhitespace.foreground': '#232534',
    'editorGutter.background': '#0E0F16',
    'scrollbarSlider.background': '#24263280',
    'scrollbarSlider.hoverBackground': '#34374A99',
    'scrollbarSlider.activeBackground': '#4B4E63B3',
    'editorWidget.background': '#171821',
    'editorWidget.border': '#242632',
    'editorSuggestWidget.background': '#171821',
    'editorSuggestWidget.border': '#242632',
    'editorSuggestWidget.selectedBackground': '#282545',
  },
};
