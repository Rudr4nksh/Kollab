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

// ============================================================================
// 1. C & C++ (DSA, Competitive Programming & Systems)
// ============================================================================
const CPP_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'main',
    detail: 'int main() boiler-plate',
    insertText: '#include <iostream>\n\nusing namespace std;\n\nint main() {\n\tios_base::sync_with_stdio(false);\n\tcin.tie(NULL);\n\n\t${1:cout << "Hello, World!" << endl;}\n\n\treturn 0;\n}',
  },
  {
    label: 'fastio',
    detail: 'DSA Fast I/O for Competitive Programming',
    insertText: 'ios_base::sync_with_stdio(false);\ncin.tie(NULL);',
  },
  {
    label: 'binsearch',
    detail: 'DSA: Binary Search Template',
    insertText: 'int binarySearch(const vector<int>& arr, int target) {\n\tint low = 0, high = arr.size() - 1;\n\twhile (low <= high) {\n\t\tint mid = low + (high - low) / 2;\n\t\tif (arr[mid] == target) return mid;\n\t\tif (arr[mid] < target) low = mid + 1;\n\t\telse high = mid - 1;\n\t}\n\treturn -1;\n}',
  },
  {
    label: 'bfs',
    detail: 'DSA: Breadth First Search Graph Template',
    insertText: 'void bfs(int startNode, const vector<vector<int>>& adj, int n) {\n\tvector<bool> visited(n, false);\n\tqueue<int> q;\n\tq.push(startNode);\n\tvisited[startNode] = true;\n\n\twhile (!q.empty()) {\n\t\tint node = q.front();\n\t\tq.pop();\n\t\tfor (int neighbor : adj[node]) {\n\t\t\tif (!visited[neighbor]) {\n\t\t\t\tvisited[neighbor] = true;\n\t\t\t\tq.push(neighbor);\n\t\t\t}\n\t\t}\n\t}\n}',
  },
  {
    label: 'dfs',
    detail: 'DSA: Depth First Search Graph Template',
    insertText: 'void dfs(int node, const vector<vector<int>>& adj, vector<bool>& visited) {\n\tvisited[node] = true;\n\tfor (int neighbor : adj[node]) {\n\t\tif (!visited[neighbor]) {\n\t\t\tdfs(neighbor, adj, visited);\n\t\t}\n\t}\n}',
  },
  {
    label: 'dsu',
    detail: 'DSA: Disjoint Set Union (Union Find)',
    insertText: 'struct DSU {\n\tvector<int> parent, rank;\n\tDSU(int n) : parent(n), rank(n, 0) {\n\t\tiota(parent.begin(), parent.end(), 0);\n\t}\n\tint find(int i) {\n\t\tif (parent[i] == i) return i;\n\t\treturn parent[i] = find(parent[i]);\n\t}\n\tbool unite(int i, int j) {\n\t\tint rootI = find(i), rootJ = find(j);\n\t\tif (rootI != rootJ) {\n\t\t\tif (rank[rootI] < rank[rootJ]) swap(rootI, rootJ);\n\t\t\tparent[rootJ] = rootI;\n\t\t\tif (rank[rootI] == rank[rootJ]) rank[rootI]++;\n\t\t\treturn true;\n\t\t}\n\t\treturn false;\n\t}\n};',
  },
  {
    label: 'cout',
    detail: 'std::cout << ... << std::endl;',
    insertText: 'cout << ${1} << endl;',
  },
  {
    label: 'cin',
    detail: 'std::cin >> ...;',
    insertText: 'cin >> ${1};',
  },
  {
    label: 'vector',
    detail: 'vector<T>',
    insertText: 'vector<${1:int}> ${2:vec};',
  },
  {
    label: 'pq',
    detail: 'priority_queue (Max/Min Heap)',
    insertText: 'priority_queue<${1:int}> ${2:maxHeap}; // Or priority_queue<${1:int}, vector<${1:int}>, greater<${1:int}>> minHeap;',
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
  ...[
    'cout', 'cin', 'endl', 'vector', 'string', 'map', 'unordered_map', 'set', 'unordered_set',
    'pair', 'make_pair', 'sort', 'reverse', 'max', 'min', 'push_back', 'emplace_back',
    'auto', 'const', 'constexpr', 'nullptr', 'virtual', 'override', 'public:', 'private:',
    'protected:', 'namespace', 'template', 'typename', 'typedef', 'using', 'inline',
    'static', 'return', 'int', 'float', 'double', 'char', 'bool', 'void', 'long long'
  ].map((kw) => ({ label: kw, kind: 'keyword', insertText: kw, isSnippet: false })),
];

const C_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'main',
    detail: 'C main function',
    insertText: '#include <stdio.h>\n#include <stdlib.h>\n\nint main(int argc, char *argv[]) {\n\t${1:printf("Hello, World!\\n");}\n\treturn 0;\n}',
  },
  {
    label: 'printf',
    detail: 'printf format output',
    insertText: 'printf("${1:%d}\\n", ${2:var});',
  },
  {
    label: 'scanf',
    detail: 'scanf format input',
    insertText: 'scanf("${1:%d}", &${2:var});',
  },
  {
    label: 'malloc',
    detail: 'Dynamic memory allocation',
    insertText: '(${1:int}*) malloc(${2:n} * sizeof(${1:int}));',
  },
  {
    label: 'free',
    detail: 'free allocated pointer',
    insertText: 'free(${1:ptr});\n${1:ptr} = NULL;',
  },
  ...[
    'printf', 'scanf', 'malloc', 'free', 'sizeof', 'NULL', 'struct', 'typedef',
    'int', 'char', 'float', 'double', 'void', 'return', 'if', 'else', 'for', 'while', 'switch'
  ].map((kw) => ({ label: kw, kind: 'keyword', insertText: kw, isSnippet: false })),
];

// ============================================================================
// 2. Python (AI / ML, Data Science & Backend)
// ============================================================================
const PYTHON_SUGGESTIONS: RawSuggestion[] = [
  // AI / ML Frameworks: PyTorch, TensorFlow, Scikit-Learn
  {
    label: 'pytorch_nn',
    detail: 'AI/ML: PyTorch Neural Network Module',
    insertText: 'import torch\nimport torch.nn as nn\nimport torch.optim as optim\n\nclass ${1:NeuralNet}(nn.Module):\n\tdef __init__(self, input_dim, hidden_dim, output_dim):\n\t\tsuper().__init__()\n\t\tself.fc1 = nn.Linear(input_dim, hidden_dim)\n\t\tself.relu = nn.ReLU()\n\t\tself.fc2 = nn.Linear(hidden_dim, output_dim)\n\n\tdef forward(self, x):\n\t\tout = self.fc1(x)\n\t\tout = self.relu(out)\n\t\tout = self.fc2(out)\n\t\treturn out\n',
  },
  {
    label: 'pytorch_train',
    detail: 'AI/ML: PyTorch Training Loop',
    insertText: 'device = torch.device("cuda" if torch.cuda.is_available() else "cpu")\nmodel = ${1:NeuralNet}().to(device)\ncriterion = nn.CrossEntropyLoss()\noptimizer = optim.Adam(model.parameters(), lr=${2:0.001})\n\nfor epoch in range(${3:10}):\n\tfor batch_x, batch_y in ${4:train_loader}:\n\t\tbatch_x, batch_y = batch_x.to(device), batch_y.to(device)\n\t\toptimizer.zero_grad()\n\t\toutputs = model(batch_x)\n\t\tloss = criterion(outputs, batch_y)\n\t\tloss.backward()\n\t\toptimizer.step()\n\tprint(f"Epoch {epoch+1}, Loss: {loss.item():.4f}")\n',
  },
  {
    label: 'tensorflow_model',
    detail: 'AI/ML: TensorFlow / Keras Sequential Model',
    insertText: 'import tensorflow as tf\nfrom tensorflow import keras\nfrom tensorflow.keras import layers\n\nmodel = keras.Sequential([\n\tlayers.Dense(${1:128}, activation="relu", input_shape=(${2:input_dim},)),\n\tlayers.Dropout(0.2),\n\tlayers.Dense(${3:64}, activation="relu"),\n\tlayers.Dense(${4:num_classes}, activation="softmax")\n])\n\nmodel.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])\n',
  },
  {
    label: 'sklearn_pipeline',
    detail: 'AI/ML: Scikit-Learn Train/Test & Model Fit',
    insertText: 'from sklearn.model_selection import train_test_split\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.metrics import accuracy_score, classification_report\n\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nmodel = RandomForestClassifier(n_estimators=100, random_state=42)\nmodel.fit(X_train, y_train)\ny_pred = model.predict(X_test)\nprint(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")\nprint(classification_report(y_test, y_pred))\n',
  },
  {
    label: 'numpy_setup',
    detail: 'AI/ML: NumPy array utilities',
    insertText: 'import numpy as np\n\nx = np.linspace(${1:0}, ${2:10}, ${3:100})\ny = np.random.randn(${4:100})\nmatrix = np.zeros((${5:3}, ${6:3}))\n',
  },
  {
    label: 'pandas_eda',
    detail: 'AI/ML: Pandas Data Loading and EDA',
    insertText: 'import pandas as pd\n\ndf = pd.read_csv("${1:data.csv}")\nprint(df.head())\nprint(df.info())\nprint(df.describe())\n',
  },
  {
    label: 'matplotlib_plot',
    detail: 'AI/ML: Matplotlib Visualization',
    insertText: 'import matplotlib.pyplot as plt\n\nplt.figure(figsize=(10, 6))\nplt.plot(${1:x}, ${2:y}, label="${3:Model}")\nplt.title("${4:Performance Plot}")\nplt.xlabel("Epoch")\nplt.ylabel("Loss")\nplt.legend()\nplt.grid(True)\nplt.show()\n',
  },
  {
    label: 'huggingface_llm',
    detail: 'AI/ML: Hugging Face Transformers Pipeline',
    insertText: 'from transformers import pipeline, AutoModelForCausalLM, AutoTokenizer\n\npipe = pipeline("${1:text-generation}", model="${2:gpt2}")\noutput = pipe("${3:Hello, artificial intelligence}", max_length=50)\nprint(output[0]["generated_text"])\n',
  },
  // Core Python snippets
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
    label: 'tryexcept',
    detail: 'try / except block',
    insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:print(e)}',
  },
  ...[
    'torch', 'tensorflow', 'numpy', 'pandas', 'sklearn', 'matplotlib', 'seaborn',
    'print', 'len', 'range', 'enumerate', 'zip', 'input', 'int', 'float', 'str', 'bool',
    'list', 'dict', 'set', 'tuple', 'isinstance', 'type', 'sum', 'min', 'max', 'open',
    'import', 'from', 'as', 'return', 'if', 'elif', 'else', 'for', 'while', 'break',
    'continue', 'try', 'except', 'finally', 'raise', 'with', 'yield', 'lambda', 'self'
  ].map((kw) => ({ label: kw, kind: 'keyword', insertText: kw, isSnippet: false })),
];

// ============================================================================
// 3. Java (DSA, Enterprise & Android)
// ============================================================================
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
    insertText: 'public class ${1:Main} {\n\tpublic static void main(String[] args) {\n\t\t${2:System.out.println("Hello, World!");}\n\t}\n}',
  },
  {
    label: 'binsearch',
    detail: 'DSA: Binary Search in Java',
    insertText: 'public static int binarySearch(int[] arr, int target) {\n\tint low = 0, high = arr.length - 1;\n\twhile (low <= high) {\n\t\tint mid = low + (high - low) / 2;\n\t\tif (arr[mid] == target) return mid;\n\t\tif (arr[mid] < target) low = mid + 1;\n\t\telse high = mid - 1;\n\t}\n\treturn -1;\n}',
  },
  {
    label: 'bfs',
    detail: 'DSA: BFS Graph Traversal in Java',
    insertText: 'public static void bfs(int start, List<List<Integer>> adj, int n) {\n\tboolean[] visited = new boolean[n];\n\tQueue<Integer> queue = new LinkedList<>();\n\tqueue.add(start);\n\tvisited[start] = true;\n\twhile (!queue.isEmpty()) {\n\t\tint curr = queue.poll();\n\t\tfor (int neighbor : adj.get(curr)) {\n\t\t\tif (!visited[neighbor]) {\n\t\t\t\tvisited[neighbor] = true;\n\t\t\t\tqueue.add(neighbor);\n\t\t\t}\n\t\t}\n\t}\n}',
  },
  {
    label: 'scanner',
    detail: 'Scanner input',
    insertText: 'Scanner sc = new Scanner(System.in);\nint ${1:n} = sc.nextInt();',
  },
  ...[
    'public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'extends',
    'implements', 'import', 'package', 'new', 'this', 'super', 'return', 'void', 'int',
    'double', 'float', 'boolean', 'char', 'String', 'System.out.println', 'ArrayList', 'HashMap', 'Queue'
  ].map((kw) => ({ label: kw, kind: 'keyword', insertText: kw, isSnippet: false })),
];

// ============================================================================
// 4. Rust (DSA, Systems & High-Performance AI)
// ============================================================================
const RUST_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'main',
    detail: 'fn main() Entry Point',
    insertText: 'fn main() {\n\tprintln!("${1:Hello, world!}");\n}',
  },
  {
    label: 'fn',
    detail: 'Function definition',
    insertText: 'fn ${1:function_name}(${2:params}) -> ${3:i32} {\n\t${4:unimplemented!()}\n}',
  },
  {
    label: 'struct',
    detail: 'struct definition',
    insertText: '#[derive(Debug, Clone)]\npub struct ${1:MyStruct} {\n\tpub ${2:field}: ${3:String},\n}',
  },
  {
    label: 'impl',
    detail: 'impl block for struct',
    insertText: 'impl ${1:MyStruct} {\n\tpub fn new(${2:field}: ${3:String}) -> Self {\n\t\tSelf { ${2:field} }\n\t}\n}',
  },
  {
    label: 'match',
    detail: 'match pattern',
    insertText: 'match ${1:val} {\n\tSome(${2:x}) => ${3:println!("{}", x)},\n\tNone => (),\n}',
  },
  {
    label: 'vec',
    detail: 'Vector initialization',
    insertText: 'let mut ${1:vec}: Vec<${2:i32}> = Vec::new();',
  },
  ...[
    'fn', 'let', 'mut', 'pub', 'struct', 'enum', 'impl', 'trait', 'match', 'if', 'else',
    'for', 'while', 'loop', 'return', 'break', 'continue', 'Vec', 'String', 'Option', 'Some', 'None',
    'Result', 'Ok', 'Err', 'println!', 'eprintln!', 'format!', 'panic!', 'async', 'await', 'use'
  ].map((kw) => ({ label: kw, kind: 'keyword', insertText: kw, isSnippet: false })),
];

// ============================================================================
// 5. Go / Golang (Backend & Microservices)
// ============================================================================
const GO_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'main',
    detail: 'package main / func main',
    insertText: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("${1:Hello, World!}")\n}',
  },
  {
    label: 'fn',
    detail: 'func name(params) return',
    insertText: 'func ${1:name}(${2:params}) ${3:error} {\n\t${4}\n\treturn nil\n}',
  },
  {
    label: 'struct',
    detail: 'type Name struct',
    insertText: 'type ${1:Name} struct {\n\t${2:Field} ${3:string} `json:"${4:field}"`\n}',
  },
  {
    label: 'goroutine',
    detail: 'go func() concurrent routine',
    insertText: 'go func() {\n\t${1}\n}()',
  },
  {
    label: 'iferr',
    detail: 'if err != nil check',
    insertText: 'if err != nil {\n\treturn err\n}',
  },
  ...[
    'package', 'import', 'func', 'var', 'const', 'type', 'struct', 'interface', 'return',
    'if', 'else', 'switch', 'case', 'for', 'range', 'go', 'chan', 'select', 'defer', 'nil',
    'make', 'len', 'append', 'fmt.Println', 'fmt.Printf', 'fmt.Sprintf'
  ].map((kw) => ({ label: kw, kind: 'keyword', insertText: kw, isSnippet: false })),
];

// ============================================================================
// 6. Kotlin (Android & Systems)
// ============================================================================
const KOTLIN_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'main',
    detail: 'fun main()',
    insertText: 'fun main() {\n\tprintln("${1:Hello, Kotlin!}")\n}',
  },
  {
    label: 'dataclass',
    detail: 'data class declaration',
    insertText: 'data class ${1:User}(val ${2:id}: Long, val ${3:name}: String)',
  },
  {
    label: 'fun',
    detail: 'Function declaration',
    insertText: 'fun ${1:name}(${2:params}): ${3:Unit} {\n\t${4}\n}',
  },
  ...[
    'fun', 'val', 'var', 'class', 'data class', 'interface', 'object', 'when', 'if', 'else',
    'for', 'while', 'return', 'println', 'listOf', 'mutableListOf', 'mapOf', 'suspend'
  ].map((kw) => ({ label: kw, kind: 'keyword', insertText: kw, isSnippet: false })),
];

// ============================================================================
// 7. C# (.NET / Enterprise / Game Dev)
// ============================================================================
const CSHARP_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'main',
    detail: 'Console Application Main',
    insertText: 'using System;\n\nnamespace ${1:App}\n{\n\tclass Program\n\t{\n\t\tstatic void Main(string[] args)\n\t\t{\n\t\t\tConsole.WriteLine("${2:Hello, C# world!}");\n\t\t}\n\t}\n}',
  },
  {
    label: 'cw',
    detail: 'Console.WriteLine()',
    insertText: 'Console.WriteLine(${1});',
  },
  {
    label: 'prop',
    detail: 'Property with getter & setter',
    insertText: 'public ${1:string} ${2:MyProperty} { get; set; }',
  },
  ...[
    'using', 'namespace', 'class', 'struct', 'interface', 'public', 'private', 'protected',
    'static', 'async', 'await', 'Task', 'var', 'string', 'int', 'Console.WriteLine', 'List<T>', 'Dictionary<TKey, TValue>'
  ].map((kw) => ({ label: kw, kind: 'keyword', insertText: kw, isSnippet: false })),
];

// ============================================================================
// 8. SQL (Databases, Analytics & AI Feature Extraction)
// ============================================================================
const SQL_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'select',
    detail: 'SELECT statement',
    insertText: 'SELECT ${1:*}\nFROM ${2:table_name}\nWHERE ${3:condition}\nORDER BY ${4:id} DESC\nLIMIT ${5:100};',
  },
  {
    label: 'createtable',
    detail: 'CREATE TABLE statement',
    insertText: 'CREATE TABLE ${1:users} (\n\tid SERIAL PRIMARY KEY,\n\tname VARCHAR(255) NOT NULL,\n\temail VARCHAR(255) UNIQUE NOT NULL,\n\tcreated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);',
  },
  {
    label: 'insert',
    detail: 'INSERT INTO statement',
    insertText: 'INSERT INTO ${1:table_name} (${2:column1}, ${3:column2})\nVALUES (${4:value1}, ${5:value2});',
  },
  {
    label: 'join',
    detail: 'INNER JOIN statement',
    insertText: 'SELECT ${1:a.id}, ${2:b.name}\nFROM ${3:table1} a\nINNER JOIN ${4:table2} b ON a.${5:id} = b.${6:table1_id};',
  },
  {
    label: 'groupby',
    detail: 'GROUP BY aggregation',
    insertText: 'SELECT ${1:category}, COUNT(*), AVG(${2:metric})\nFROM ${3:table_name}\nGROUP BY ${1:category}\nHAVING COUNT(*) > ${4:5};',
  },
  ...[
    'SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'UPDATE', 'DELETE', 'CREATE TABLE',
    'ALTER TABLE', 'DROP TABLE', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'CROSS JOIN',
    'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET', 'DISTINCT', 'COUNT', 'AVG', 'SUM',
    'PRIMARY KEY', 'FOREIGN KEY', 'NOT NULL', 'DEFAULT', 'INDEX'
  ].map((kw) => ({ label: kw, kind: 'keyword', insertText: kw, isSnippet: false })),
];

// ============================================================================
// 9. R (Statistics, Visualization & Data Science)
// ============================================================================
const R_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'ggplot',
    detail: 'Data Science: ggplot2 plot',
    insertText: 'library(ggplot2)\n\nggplot(data = ${1:df}, aes(x = ${2:x_col}, y = ${3:y_col})) +\n\tgeom_point(color = "steelblue") +\n\ttheme_minimal() +\n\tlabs(title = "${4:Data Visualization}", x = "${2:x_col}", y = "${3:y_col}")',
  },
  {
    label: 'linear_model',
    detail: 'Data Science: Linear Regression lm()',
    insertText: 'model <- lm(${1:y} ~ ${2:x1} + ${3:x2}, data = ${4:df})\nsummary(model)',
  },
  {
    label: 'dataframe',
    detail: 'data.frame constructor',
    insertText: '${1:df} <- data.frame(\n\t${2:id} = 1:10,\n\t${3:value} = rnorm(10)\n)',
  },
  ...[
    'library', 'data.frame', 'ggplot', 'aes', 'geom_point', 'geom_line', 'geom_bar',
    'summary', 'lm', 'mean', 'median', 'sd', 'read.csv', 'head', 'tail', 'c', 'print'
  ].map((kw) => ({ label: kw, kind: 'keyword', insertText: kw, isSnippet: false })),
];

// ============================================================================
// 10. Julia (Scientific Machine Learning & Numerical Computing)
// ============================================================================
const JULIA_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'main',
    detail: 'Julia function & entry',
    insertText: 'function main()\n\tprintln("${1:Hello from Julia!}")\nend\n\nmain()',
  },
  {
    label: 'flux_model',
    detail: 'Scientific ML: Flux.jl Neural Network',
    insertText: 'using Flux\n\nmodel = Chain(\n\tDense(${1:10} => ${2:32}, relu),\n\tDense(${2:32} => ${3:1})\n)\n\nloss(model, x, y) = Flux.mse(model(x), y)',
  },
  ...[
    'function', 'end', 'for', 'in', 'while', 'if', 'elseif', 'else', 'return',
    'using', 'import', 'struct', 'mutable struct', 'println', 'zeros', 'ones', '@time', 'Flux'
  ].map((kw) => ({ label: kw, kind: 'keyword', insertText: kw, isSnippet: false })),
];

// ============================================================================
// 11. Shell / Bash (Automation, CUDA & Dev Scripts)
// ============================================================================
const SHELL_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'bash',
    detail: '#!/usr/bin/env bash template',
    insertText: '#!/usr/bin/env bash\nset -euo pipefail\n\necho "${1:Running script...}"',
  },
  {
    label: 'if',
    detail: 'if [ condition ]; then ... fi',
    insertText: 'if [ ${1:-f "$FILE"} ]; then\n\techo "${2:File exists}"\nfi',
  },
  {
    label: 'for',
    detail: 'for item in list; do ... done',
    insertText: 'for ${1:item} in "${2:@}"; do\n\techo "$${1:item}"\ndone',
  },
  {
    label: 'cuda_check',
    detail: 'AI/ML: Check CUDA GPU Status',
    insertText: 'nvidia-smi\npython3 -c "import torch; print(\'CUDA Available:\', torch.cuda.is_available(), \'Devices:\', torch.cuda.device_count())"',
  },
  ...[
    'echo', 'exit', 'cd', 'ls', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown', 'curl', 'wget',
    'grep', 'awk', 'sed', 'cat', 'source', 'export', 'pip', 'python3', 'conda', 'docker'
  ].map((kw) => ({ label: kw, kind: 'keyword', insertText: kw, isSnippet: false })),
];

// ============================================================================
// 12. Dart (Flutter & Cross-Platform)
// ============================================================================
const DART_SUGGESTIONS: RawSuggestion[] = [
  {
    label: 'main',
    detail: 'void main()',
    insertText: 'void main() {\n\t${1:print("Hello, Dart!");}\n}',
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
];

// ============================================================================
// 13. HTML5
// ============================================================================
const HTML_SUGGESTIONS: RawSuggestion[] = [
  {
    label: '!',
    detail: 'HTML5 Boilerplate Template',
    insertText: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n\t<link rel="stylesheet" href="${2:style.css}">\n</head>\n<body>\n\t${3:<h1>Hello, World!</h1>}\n\t<script src="${4:script.js}"></script>\n</body>\n</html>',
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
];

// ============================================================================
// 14. CSS & SCSS
// ============================================================================
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
    label: 'card',
    detail: 'Dark glassmorphic card',
    insertText: 'background-color: ${1:#0F1117};\nborder: 1px solid ${2:rgba(255, 255, 255, 0.08)};\nborder-radius: ${3:8px};\npadding: ${4:16px};',
  },
];

// ============================================================================
// 15. JavaScript & TypeScript (Full Web Stack)
// ============================================================================
const JS_TS_SUGGESTIONS: RawSuggestion[] = [
  { label: 'clg', detail: 'console.log()', insertText: 'console.log(${1});' },
  { label: 'cerr', detail: 'console.error()', insertText: 'console.error(${1});' },
  { label: 'afn', detail: 'Arrow function', insertText: 'const ${1:name} = (${2:params}) => {\n\t${3}\n};' },
  { label: 'asyncfn', detail: 'Async arrow function', insertText: 'const ${1:name} = async (${2:params}) => {\n\t${3}\n};' },
  { label: 'prom', detail: 'new Promise()', insertText: 'new Promise((resolve, reject) => {\n\t${1}\n});' },
  { label: 'trycatch', detail: 'try / catch block', insertText: 'try {\n\t${1}\n} catch (error) {\n\tconsole.error(error);\n}' },
  { label: 'rfce', detail: 'React Functional Component', insertText: 'import React from "react";\n\nexport const ${1:ComponentName}: React.FC = () => {\n\treturn (\n\t\t<div>\n\t\t\t<h1>${1:ComponentName}</h1>\n\t\t</div>\n\t);\n};' },
];

export function registerLanguageCompletions(monaco: MonacoType): void {
  if (completionsRegistered) return;
  completionsRegistered = true;

  // Web Development
  registerLanguage(monaco, 'javascript', JS_TS_SUGGESTIONS);
  registerLanguage(monaco, 'typescript', JS_TS_SUGGESTIONS);
  registerLanguage(monaco, 'html', HTML_SUGGESTIONS);
  registerLanguage(monaco, 'css', CSS_SUGGESTIONS);
  registerLanguage(monaco, 'scss', CSS_SUGGESTIONS);
  registerLanguage(monaco, 'less', CSS_SUGGESTIONS);

  // DSA & Systems
  registerLanguage(monaco, 'c', C_SUGGESTIONS);
  registerLanguage(monaco, 'cpp', CPP_SUGGESTIONS);
  registerLanguage(monaco, 'java', JAVA_SUGGESTIONS);
  registerLanguage(monaco, 'rust', RUST_SUGGESTIONS);
  registerLanguage(monaco, 'go', GO_SUGGESTIONS);
  registerLanguage(monaco, 'kotlin', KOTLIN_SUGGESTIONS);
  registerLanguage(monaco, 'csharp', CSHARP_SUGGESTIONS);
  registerLanguage(monaco, 'dart', DART_SUGGESTIONS);

  // AI / ML & Data Science
  registerLanguage(monaco, 'python', PYTHON_SUGGESTIONS);
  registerLanguage(monaco, 'r', R_SUGGESTIONS);
  registerLanguage(monaco, 'julia', JULIA_SUGGESTIONS);
  registerLanguage(monaco, 'sql', SQL_SUGGESTIONS);
  registerLanguage(monaco, 'shell', SHELL_SUGGESTIONS);
}
