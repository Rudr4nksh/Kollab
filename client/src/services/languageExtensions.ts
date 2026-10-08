import type { SupportedLanguage } from '../types/index.ts';

export interface LanguageMeta {
  id: SupportedLanguage;
  name: string;
  category: 'Web Dev' | 'Systems & DSA' | 'AI & Data' | 'General & Config';
  primaryExt: string;
  extensions: string[];
  description: string;
}

export const LANGUAGE_METAS: LanguageMeta[] = [
  // Web Dev
  { id: 'javascript', name: 'JavaScript', category: 'Web Dev', primaryExt: '.js', extensions: ['.js', '.jsx', '.mjs', '.cjs'], description: 'Modern web scripting and Node.js' },
  { id: 'typescript', name: 'TypeScript', category: 'Web Dev', primaryExt: '.ts', extensions: ['.ts', '.tsx'], description: 'Typed JavaScript for scalable applications' },
  { id: 'html', name: 'HTML5', category: 'Web Dev', primaryExt: '.html', extensions: ['.html', '.htm'], description: 'Web page markup and structure' },
  { id: 'css', name: 'CSS3', category: 'Web Dev', primaryExt: '.css', extensions: ['.css'], description: 'Web styling and layouts' },
  { id: 'scss', name: 'SCSS / SASS', category: 'Web Dev', primaryExt: '.scss', extensions: ['.scss', '.sass'], description: 'Modular CSS preprocessor' },
  { id: 'json', name: 'JSON', category: 'Web Dev', primaryExt: '.json', extensions: ['.json'], description: 'Standard data interchange format' },
  { id: 'yaml', name: 'YAML', category: 'Web Dev', primaryExt: '.yaml', extensions: ['.yaml', '.yml'], description: 'Human-readable configuration format' },
  { id: 'xml', name: 'XML / SVG', category: 'Web Dev', primaryExt: '.xml', extensions: ['.xml', '.svg'], description: 'Extensible markup and vectors' },
  { id: 'php', name: 'PHP', category: 'Web Dev', primaryExt: '.php', extensions: ['.php'], description: 'Server-side web scripting' },
  { id: 'ruby', name: 'Ruby', category: 'Web Dev', primaryExt: '.rb', extensions: ['.rb'], description: 'Dynamic, object-oriented language' },
  { id: 'graphql', name: 'GraphQL', category: 'Web Dev', primaryExt: '.graphql', extensions: ['.graphql', '.gql'], description: 'API query and schema language' },

  // Systems & DSA
  { id: 'cpp', name: 'C++', category: 'Systems & DSA', primaryExt: '.cpp', extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.h'], description: 'High-performance competitive coding and systems' },
  { id: 'c', name: 'C', category: 'Systems & DSA', primaryExt: '.c', extensions: ['.c', '.h'], description: 'Low-level systems programming' },
  { id: 'java', name: 'Java', category: 'Systems & DSA', primaryExt: '.java', extensions: ['.java'], description: 'Object-oriented enterprise & DSA language' },
  { id: 'rust', name: 'Rust', category: 'Systems & DSA', primaryExt: '.rs', extensions: ['.rs'], description: 'Memory-safe systems programming' },
  { id: 'go', name: 'Go (Golang)', category: 'Systems & DSA', primaryExt: '.go', extensions: ['.go'], description: 'Fast, concurrent cloud and backend systems' },
  { id: 'kotlin', name: 'Kotlin', category: 'Systems & DSA', primaryExt: '.kt', extensions: ['.kt', '.kts'], description: 'Modern concise language for JVM & Android' },
  { id: 'csharp', name: 'C# (.NET)', category: 'Systems & DSA', primaryExt: '.cs', extensions: ['.cs'], description: 'Modern multi-paradigm .NET language' },
  { id: 'swift', name: 'Swift', category: 'Systems & DSA', primaryExt: '.swift', extensions: ['.swift'], description: 'Apple iOS & macOS native development' },
  { id: 'dart', name: 'Dart (Flutter)', category: 'Systems & DSA', primaryExt: '.dart', extensions: ['.dart'], description: 'Client-optimized language for multi-platform apps' },

  // AI & Data
  { id: 'python', name: 'Python', category: 'AI & Data', primaryExt: '.py', extensions: ['.py', '.pyw'], description: 'AI, ML, data science, and scripting' },
  { id: 'sql', name: 'SQL', category: 'AI & Data', primaryExt: '.sql', extensions: ['.sql'], description: 'Relational database queries' },
  { id: 'r', name: 'R', category: 'AI & Data', primaryExt: '.r', extensions: ['.r'], description: 'Statistical computing and data analytics' },
  { id: 'julia', name: 'Julia', category: 'AI & Data', primaryExt: '.jl', extensions: ['.jl'], description: 'High-performance numerical computing' },
  { id: 'shell', name: 'Shell / Bash', category: 'AI & Data', primaryExt: '.sh', extensions: ['.sh', '.bash'], description: 'Command-line automation scripts' },

  // General & Config
  { id: 'markdown', name: 'Markdown', category: 'General & Config', primaryExt: '.md', extensions: ['.md', '.markdown'], description: 'Documentation and note-taking' },
  { id: 'dockerfile', name: 'Dockerfile', category: 'General & Config', primaryExt: '.dockerfile', extensions: ['dockerfile', '.dockerfile'], description: 'Container image build specifications' },
  { id: 'plaintext', name: 'Plain Text', category: 'General & Config', primaryExt: '.txt', extensions: ['.txt', '.log'], description: 'Unformatted generic text' },
];

export const POPULAR_EXTENSIONS = [
  { ext: '.py', label: 'Python', lang: 'python' as SupportedLanguage },
  { ext: '.js', label: 'JavaScript', lang: 'javascript' as SupportedLanguage },
  { ext: '.ts', label: 'TypeScript', lang: 'typescript' as SupportedLanguage },
  { ext: '.cpp', label: 'C++', lang: 'cpp' as SupportedLanguage },
  { ext: '.java', label: 'Java', lang: 'java' as SupportedLanguage },
  { ext: '.go', label: 'Go', lang: 'go' as SupportedLanguage },
  { ext: '.rs', label: 'Rust', lang: 'rust' as SupportedLanguage },
  { ext: '.html', label: 'HTML', lang: 'html' as SupportedLanguage },
  { ext: '.css', label: 'CSS', lang: 'css' as SupportedLanguage },
  { ext: '.json', label: 'JSON', lang: 'json' as SupportedLanguage },
  { ext: '.sql', label: 'SQL', lang: 'sql' as SupportedLanguage },
  { ext: '.md', label: 'Markdown', lang: 'markdown' as SupportedLanguage },
];

export function getLanguageMeta(lang: SupportedLanguage): LanguageMeta {
  return LANGUAGE_METAS.find((m) => m.id === lang) || {
    id: lang,
    name: lang.toUpperCase(),
    category: 'General & Config',
    primaryExt: '.txt',
    extensions: ['.txt'],
    description: 'Text file',
  };
}

export function getMonacoLanguageId(lang: SupportedLanguage): string {
  switch (lang) {
    case 'cpp':
    case 'c':
      return 'cpp';
    case 'shell':
      return 'shell';
    case 'markdown':
      return 'markdown';
    case 'csharp':
      return 'csharp';
    case 'dockerfile':
      return 'dockerfile';
    default:
      return lang;
  }
}
