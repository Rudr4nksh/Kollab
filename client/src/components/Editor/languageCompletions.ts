import type { languages } from 'monaco-editor';

type MonacoType = typeof import('monaco-editor');

let completionsRegistered = false;

interface RawSuggestion {
  label: string;
  kind?: string;
  insertText: string;
  detail?: string;
  documentation?: string;
  isSnippet?: boolean;
}

function mapKind(monaco: MonacoType, kind?: string): languages.CompletionItemKind {
  switch (kind) {
    case 'function':
    case 'method':
      return monaco.languages.CompletionItemKind.Function;
    case 'class':
      return monaco.languages.CompletionItemKind.Class;
    case 'keyword':
      return monaco.languages.CompletionItemKind.Keyword;
    case 'variable':
      return monaco.languages.CompletionItemKind.Variable;
    case 'property':
      return monaco.languages.CompletionItemKind.Property;
    case 'module':
      return monaco.languages.CompletionItemKind.Module;
    case 'type':
      return monaco.languages.CompletionItemKind.TypeParameter;
    case 'snippet':
    default:
      return monaco.languages.CompletionItemKind.Snippet;
  }
}

function registerLanguage(monaco: MonacoType, languageId: string, suggestions: RawSuggestion[]) {
  monaco.languages.registerCompletionItemProvider(languageId, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: suggestions.map((item) => ({
          label: item.label,
          kind: mapKind(monaco, item.kind),
          insertText: item.insertText,
          insertTextRules: item.isSnippet !== false
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          detail: item.detail,
          documentation: item.documentation,
          range,
        })),
      };
    },
  });
}

// C / C++ Completions
const CPP_SUGGESTIONS: RawSuggestion[] = [
  // Snippets
  {
    label: 'main',
    detail: 'int main() boiler-plate',
    insertText: 'int main() {\n\t${1}\n\treturn 0;\n}',
  },
  {
    label: 'cout',
    detail: 'std::cout << ... << std::endl;',
    insertText: 'std::cout << ${1} << std::endl;',
  },
  {
    label: 'cin',
    detail: 'std::cin >> ...;',
    insertText: 'std::cin >> ${1};',
  },
  {
    label: 'include',
    detail: '#include <...>',
    insertText: '#include <${1:iostream}>',
  },
  {
    label: 'fori',
    detail: 'Indexed for loop',
    insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n\t${3}\n}',
  },
  {
    label: 'forit',
    detail: 'Range-based for loop',
    insertText: 'for (const auto& ${1:item} : ${2:collection}) {\n\t${3}\n}',
  },
  {
    label: 'class',
    detail: 'C++ Class declaration',
    insertText: 'class ${1:ClassName} {\npublic:\n\t${1:ClassName}();\n\t~${1:ClassName}();\nprivate:\n\t${2}\n};',
  },
  {
    label: 'struct',
    detail: 'C++ Struct declaration',
    insertText: 'struct ${1:StructName} {\n\t${2}\n};',
  },
  {
    label: 'vector',
    detail: 'std::vector<T>',
    insertText: 'std::vector<${1:int}> ${2:vec};',
  },
  {
    label: 'map',
    detail: 'std::map<Key, Value>',
    insertText: 'std::map<${1:std::string}, ${2:int}> ${3:map};',
  },
  {
    label: 'string',
    detail: 'std::string',
    insertText: 'std::string ${1:str} = "${2}";',
  },
  {
    label: 'trycatch',
    detail: 'try / catch block',
    insertText: 'try {\n\t${1}\n} catch (const std::exception& ${2:e}) {\n\tstd::cerr << ${2:e}.what() << std::endl;\n}',
  },
  // Keywords & standard functions
  ...[
    'std::cout', 'std::cin', 'std::endl', 'std::vector', 'std::string', 'std::map',
    'std::set', 'std::pair', 'std::make_pair', 'std::sort', 'std::reverse', 'std::max',
    'std::min', 'std::unique_ptr', 'std::shared_ptr', 'std::make_unique', 'std::make_shared',
    'auto', 'const', 'constexpr', 'nullptr', 'virtual', 'override', 'public:', 'private:',
    'protected:', 'namespace', 'template', 'typename', 'typedef', 'using', 'inline',
    'static', 'extern', 'volatile', 'sizeof', 'static_cast', 'dynamic_cast', 'return',
    'int', 'float', 'double', 'char', 'bool', 'void', 'long', 'short', 'unsigned'
  ].map((kw) => ({
    label: kw,
    kind: 'keyword',
    insertText: kw,
    isSnippet: false,
  })),
];

// Python Completions
const PYTHON_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'main',
    detail: 'if __name__ == "__main__":',
    insertText: 'if __name__ == "__main__":\n\t${1:main()}',
  },
  {
    label: 'def',
    detail: 'Function definition',
    insertText: 'def ${1:function_name}(${2:params}):\n\t"""${3:Docstring}"""\n\t${4:pass}',
  },
  {
    label: 'class',
    detail: 'Class definition',
    insertText: 'class ${1:ClassName}:\n\tdef __init__(self, ${2:params}):\n\t\t${3:pass}',
  },
  {
    label: 'print',
    detail: 'print() function',
    insertText: 'print(${1:val})',
  },
  {
    label: 'fori',
    detail: 'for i in range(...)',
    insertText: 'for ${1:i} in range(${2:10}):\n\t${3:pass}',
  },
  {
    label: 'forin',
    detail: 'for item in items',
    insertText: 'for ${1:item} in ${2:items}:\n\t${3:pass}',
  },
  {
    label: 'while',
    detail: 'while condition:',
    insertText: 'while ${1:condition}:\n\t${2:pass}',
  },
  {
    label: 'tryexcept',
    detail: 'try / except block',
    insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:print(e)}',
  },
  {
    label: 'withopen',
    detail: 'with open(...) as f:',
    insertText: 'with open("${1:file.txt}", "${2:r}") as ${3:f}:\n\t${4:data = f.read()}',
  },
  {
    label: 'lambda',
    detail: 'lambda expression',
    insertText: 'lambda ${1:x}: ${2:x * 2}',
  },
  {
    label: 'listcomp',
    detail: 'List comprehension',
    insertText: '[${1:x} for ${1:x} in ${2:iterable}]',
  },
  {
    label: 'dictcomp',
    detail: 'Dict comprehension',
    insertText: '{${1:k}: ${2:v} for ${1:k}, ${2:v} in ${3:iterable}}',
  },
  // Builtins & Keywords
  ...[
    'print', 'len', 'range', 'enumerate', 'zip', 'input', 'int', 'float', 'str', 'bool',
    'list', 'dict', 'set', 'tuple', 'isinstance', 'type', 'sum', 'min', 'max', 'abs',
    'round', 'sorted', 'reversed', 'map', 'filter', 'any', 'all', 'open', 'help', 'dir',
    'import', 'from', 'as', 'return', 'if', 'elif', 'else', 'for', 'while', 'break',
    'continue', 'try', 'except', 'finally', 'raise', 'with', 'yield', 'pass', 'assert',
    'True', 'False', 'None', 'async', 'await', 'self'
  ].map((kw) => ({
    label: kw,
    kind: 'keyword',
    insertText: kw,
    isSnippet: false,
  })),
];

// Java Completions
const JAVA_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'psvm',
    detail: 'public static void main',
    insertText: 'public static void main(String[] args) {\n\t${1}\n}',
  },
  {
    label: 'sout',
    detail: 'System.out.println()',
    insertText: 'System.out.println(${1});',
  },
  {
    label: 'class',
    detail: 'public class Name',
    insertText: 'public class ${1:Main} {\n\t${2}\n}',
  },
  {
    label: 'fori',
    detail: 'Indexed for loop',
    insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}',
  },
  {
    label: 'foreach',
    detail: 'Enhanced for loop',
    insertText: 'for (${1:String} ${2:item} : ${3:items}) {\n\t${4}\n}',
  },
  {
    label: 'trycatch',
    detail: 'try / catch block',
    insertText: 'try {\n\t${1}\n} catch (${2:Exception} ${3:e}) {\n\t${3:e}.printStackTrace();\n}',
  },
  {
    label: 'scanner',
    detail: 'Scanner input',
    insertText: 'Scanner ${1:sc} = new Scanner(System.in);',
  },
  {
    label: 'arraylist',
    detail: 'ArrayList<T>',
    insertText: 'List<${1:String}> ${2:list} = new ArrayList<>();',
  },
  {
    label: 'hashmap',
    detail: 'HashMap<K, V>',
    insertText: 'Map<${1:String}, ${2:Integer}> ${3:map} = new HashMap<>();',
  },
  ...[
    'public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'extends',
    'implements', 'import', 'package', 'new', 'this', 'super', 'return', 'void', 'int',
    'double', 'float', 'boolean', 'char', 'String', 'System.out.println', 'System.out.print',
    'if', 'else', 'switch', 'case', 'default', 'for', 'while', 'do', 'break', 'continue',
    'try', 'catch', 'finally', 'throw', 'throws', 'ArrayList', 'HashMap', 'Scanner'
  ].map((kw) => ({
    label: kw,
    kind: 'keyword',
    insertText: kw,
    isSnippet: false,
  })),
];

// Dart Completions
const DART_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'main',
    detail: 'void main()',
    insertText: 'void main() {\n\t${1:print("Hello, Dart!");}\n}',
  },
  {
    label: 'print',
    detail: 'print()',
    insertText: 'print(${1:message});',
  },
  {
    label: 'stateless',
    detail: 'Flutter StatelessWidget',
    insertText: 'class ${1:MyWidget} extends StatelessWidget {\n\tconst ${1:MyWidget}({super.key});\n\n\t@override\n\tWidget build(BuildContext context) {\n\t\treturn ${2:Container()};\n\t}\n}',
  },
  {
    label: 'stateful',
    detail: 'Flutter StatefulWidget',
    insertText: 'class ${1:MyWidget} extends StatefulWidget {\n\tconst ${1:MyWidget}({super.key});\n\n\t@override\n\tState<${1:MyWidget}> createState() => _${1:MyWidget}State();\n}\n\nclass _${1:MyWidget}State extends State<${1:MyWidget}> {\n\t@override\n\tWidget build(BuildContext context) {\n\t\treturn ${2:Container()};\n\t}\n}',
  },
  {
    label: 'class',
    detail: 'Dart class',
    insertText: 'class ${1:ClassName} {\n\t${2}\n}',
  },
  ...[
    'void', 'int', 'double', 'String', 'bool', 'var', 'final', 'const', 'late', 'dynamic',
    'class', 'abstract', 'enum', 'extends', 'with', 'implements', 'mixin', 'import', 'return',
    'if', 'else', 'switch', 'case', 'for', 'in', 'while', 'async', 'await', 'Future', 'Stream',
    'Widget', 'BuildContext', 'setState', 'Container', 'Column', 'Row', 'Text', 'Scaffold', 'Center'
  ].map((kw) => ({
    label: kw,
    kind: 'keyword',
    insertText: kw,
    isSnippet: false,
  })),
];

// HTML Completions
const HTML_SUGGESTIONS: RawSuggestion[] = [
  {
    label: '!',
    detail: 'HTML5 Boilerplate Template',
    insertText: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n\t<link rel="stylesheet" href="${2:style.css}">\n</head>\n<body>\n\t${3:<h1>Hello, World!</h1>}\n\t<script src="${4:script.js}"></script>\n</body>\n</html>',
  },
  {
    label: 'html5',
    detail: 'HTML5 Boilerplate Template',
    insertText: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t${2}\n</body>\n</html>',
  },
  {
    label: 'div',
    detail: '<div class="...">...</div>',
    insertText: '<div class="${1}">${2}</div>',
  },
  {
    label: 'btn',
    detail: '<button>...</button>',
    insertText: '<button type="${1:button}">${2:Click Me}</button>',
  },
  {
    label: 'form',
    detail: '<form>...</form>',
    insertText: '<form action="${1}" method="${2:post}">\n\t${3}\n</form>',
  },
  {
    label: 'input',
    detail: '<input type="..." />',
    insertText: '<input type="${1:text}" placeholder="${2:Enter value...}" />',
  },
  {
    label: 'linkcss',
    detail: '<link rel="stylesheet" ...>',
    insertText: '<link rel="stylesheet" href="${1:styles.css}">',
  },
  {
    label: 'scriptsrc',
    detail: '<script src="..."></script>',
    insertText: '<script src="${1:main.js}"></script>',
  },
  {
    label: 'table',
    detail: '<table> template',
    insertText: '<table>\n\t<thead>\n\t\t<tr>\n\t\t\t<th>${1:Header}</th>\n\t\t</tr>\n\t</thead>\n\t<tbody>\n\t\t<tr>\n\t\t\t<td>${2:Data}</td>\n\t\t</tr>\n\t</tbody>\n</table>',
  },
  ...[
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'input', 'textarea',
    'select', 'option', 'form', 'label', 'a', 'img', 'ul', 'ol', 'li', 'header', 'nav',
    'main', 'footer', 'section', 'article', 'aside', 'style', 'script', 'meta', 'link'
  ].map((tag) => ({
    label: tag,
    detail: `<${tag}> element`,
    insertText: `<${tag}>${1}</${tag}>`,
  })),
];

// CSS Completions
const CSS_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'flex-center',
    detail: 'Flexbox center layout',
    insertText: 'display: flex;\njustify-content: center;\nalign-items: center;',
  },
  {
    label: 'flex-col',
    detail: 'Flex column layout',
    insertText: 'display: flex;\nflex-direction: column;\ngap: ${1:12px};',
  },
  {
    label: 'grid-auto',
    detail: 'CSS Grid responsive repeat',
    insertText: 'display: grid;\ngrid-template-columns: repeat(auto-fit, minmax(${1:250px}, 1fr));\ngap: ${2:16px};',
  },
  {
    label: 'absolute-center',
    detail: 'Absolute center',
    insertText: 'position: absolute;\ntop: 50%;\nleft: 50%;\ntransform: translate(-50%, -50%);',
  },
  {
    label: 'card',
    detail: 'Dark card styling',
    insertText: 'background-color: ${1:#0F1117};\nborder: 1px solid ${2:rgba(255, 255, 255, 0.08)};\nborder-radius: ${3:8px};\npadding: ${4:16px};',
  },
  ...[
    'display: flex;', 'display: grid;', 'display: inline-block;', 'display: none;',
    'position: relative;', 'position: absolute;', 'position: fixed;', 'position: sticky;',
    'justify-content: center;', 'justify-content: space-between;', 'align-items: center;',
    'margin: 0 auto;', 'padding:', 'width: 100%;', 'height: 100%;', 'background-color:',
    'color:', 'border-radius:', 'border: 1px solid', 'font-family:', 'font-size:',
    'font-weight: 600;', 'box-shadow:', 'transition: all 0.2s ease;', 'cursor: pointer;',
    'overflow: hidden;', 'z-index:'
  ].map((prop) => ({
    label: prop.split(':')[0],
    detail: prop,
    insertText: prop,
    isSnippet: false,
  })),
];

// JavaScript / TypeScript Completions
const JS_TS_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'clg',
    detail: 'console.log()',
    insertText: 'console.log(${1});',
  },
  {
    label: 'cerr',
    detail: 'console.error()',
    insertText: 'console.error(${1});',
  },
  {
    label: 'afn',
    detail: 'Arrow function',
    insertText: 'const ${1:name} = (${2:params}) => {\n\t${3}\n};',
  },
  {
    label: 'fn',
    detail: 'Named function',
    insertText: 'function ${1:name}(${2:params}) {\n\t${3}\n}',
  },
  {
    label: 'asyncfn',
    detail: 'Async arrow function',
    insertText: 'const ${1:name} = async (${2:params}) => {\n\t${3}\n};',
  },
  {
    label: 'prom',
    detail: 'new Promise()',
    insertText: 'new Promise((resolve, reject) => {\n\t${1}\n});',
  },
  {
    label: 'fe',
    detail: 'forEach loop',
    insertText: '${1:array}.forEach((${2:item}) => {\n\t${3}\n});',
  },
  {
    label: 'map',
    detail: 'Array.map()',
    insertText: '${1:array}.map((${2:item}) => ${3});',
  },
  {
    label: 'filter',
    detail: 'Array.filter()',
    insertText: '${1:array}.filter((${2:item}) => ${3});',
  },
  {
    label: 'trycatch',
    detail: 'try / catch block',
    insertText: 'try {\n\t${1}\n} catch (error) {\n\tconsole.error(error);\n}',
  },
  {
    label: 'import',
    detail: 'import statement',
    insertText: "import { ${2} } from '${1}';",
  },
  {
    label: 'export',
    detail: 'export const ...',
    insertText: 'export const ${1:name} = ${2};',
  },
];

export function registerLanguageCompletions(monaco: MonacoType): void {
  if (completionsRegistered) return;
  completionsRegistered = true;

  registerLanguage(monaco, 'cpp', CPP_SUGGESTIONS);
  registerLanguage(monaco, 'c', CPP_SUGGESTIONS);
  registerLanguage(monaco, 'python', PYTHON_SUGGESTIONS);
  registerLanguage(monaco, 'java', JAVA_SUGGESTIONS);
  registerLanguage(monaco, 'dart', DART_SUGGESTIONS);
  registerLanguage(monaco, 'html', HTML_SUGGESTIONS);
  registerLanguage(monaco, 'css', CSS_SUGGESTIONS);
  registerLanguage(monaco, 'javascript', JS_TS_SUGGESTIONS);
  registerLanguage(monaco, 'typescript', JS_TS_SUGGESTIONS);
}
