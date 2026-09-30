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
    'editor.background': '#161B22',
    'editor.foreground': '#F0F3F6',
    'editor.lineHighlightBackground': '#1B222B',
    'editor.lineHighlightBorder': '#222A36',
    'editorLineNumber.foreground': '#434B56',
    'editorLineNumber.activeForeground': '#38BDF8',
    'editorCursor.foreground': '#38BDF8',
    'editor.selectionBackground': '#1E3A5F',
    'editor.inactiveSelectionBackground': '#162C46',
    'editor.selectionHighlightBackground': '#1A3352',
    'editorIndentGuide.background': '#1F2631',
    'editorIndentGuide.activeBackground': '#2D3847',
    'editorWhitespace.foreground': '#242C38',
    'editorGutter.background': '#161B22',
    'scrollbarSlider.background': '#242B3580',
    'scrollbarSlider.hoverBackground': '#343E4D99',
    'scrollbarSlider.activeBackground': '#434B56B3',
    'editorWidget.background': '#1A202A',
    'editorWidget.border': '#242B35',
    'editorSuggestWidget.background': '#1A202A',
    'editorSuggestWidget.border': '#242B35',
    'editorSuggestWidget.selectedBackground': '#1E3A5F',
  },
};
