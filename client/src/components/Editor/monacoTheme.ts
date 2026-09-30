import type { editor } from 'monaco-editor';

export const KOLLAB_THEME_NAME = 'ceditor-slate';

export const kollabTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'F0F3F6', background: '161B22' },
    { token: 'comment', foreground: '545D68', fontStyle: 'italic' },
    
    // Keywords (magenta/pink and purple like in Ceditor screenshot)
    { token: 'keyword', foreground: 'F472B6' },
    { token: 'keyword.control', foreground: 'F472B6' },
    { token: 'storage', foreground: 'C084FC' },
    { token: 'storage.type', foreground: 'C084FC' },

    // Strings (fresh emerald green)
    { token: 'string', foreground: '4ADE80' },
    { token: 'string.html', foreground: '4ADE80' },
    { token: 'string.yaml', foreground: '4ADE80' },

    // Numbers & constants
    { token: 'number', foreground: 'FBBF24' },
    { token: 'constant', foreground: 'F97316' },

    // Types & Classes (mint/teal)
    { token: 'type', foreground: '2DD4BF' },
    { token: 'type.identifier', foreground: '2DD4BF' },
    { token: 'class', foreground: '2DD4BF' },

    // Functions (cyan/blue)
    { token: 'function', foreground: '38BDF8' },
    { token: 'identifier', foreground: 'F0F3F6' },
    
    // Variables & Properties (yellow/amber)
    { token: 'variable', foreground: 'F0F3F6' },
    { token: 'attribute.name', foreground: 'FBBF24' },
    { token: 'attribute.value', foreground: '4ADE80' },
    { token: 'tag', foreground: '38BDF8' },
    { token: 'delimiter', foreground: '8B949E' },
    { token: 'annotation', foreground: 'F97316' }, // e.g. @override
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
