import type { FileNode, SupportedLanguage } from '../types/index.ts';

export function getLanguageFromFilename(filename: string): SupportedLanguage {
  const lower = filename.toLowerCase();
  if (lower === 'dockerfile' || lower.endsWith('.dockerfile')) {
    return 'dockerfile';
  }
  const ext = lower.split('.').pop();
  switch (ext) {
    // Web Development
    case 'html':
    case 'htm':
      return 'html';
    case 'js':
    case 'mjs':
    case 'cjs':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'css':
      return 'css';
    case 'scss':
    case 'sass':
    case 'less':
      return 'scss';
    case 'json':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'xml':
    case 'svg':
      return 'xml';
    case 'php':
      return 'php';
    case 'rb':
    case 'ruby':
      return 'ruby';
    case 'graphql':
    case 'gql':
      return 'graphql';

    // DSA & Systems Programming
    case 'c':
      return 'c';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'java':
      return 'java';
    case 'rs':
    case 'rust':
      return 'rust';
    case 'go':
      return 'go';
    case 'kt':
    case 'kts':
      return 'kotlin';
    case 'cs':
      return 'csharp';
    case 'swift':
      return 'swift';
    case 'dart':
      return 'dart';

    // AI / ML & Data Science
    case 'py':
    case 'ipynb':
    case 'pyw':
      return 'python';
    case 'r':
      return 'r';
    case 'jl':
      return 'julia';
    case 'sql':
      return 'sql';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'shell';

    // Docs & General
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return 'plaintext';
  }
}

export function getFileBadgeInfo(filename: string): { label: string; color: string; bg: string } {
  const lower = filename.toLowerCase();
  const ext = lower.split('.').pop() || '';
  if (filename === '.gitignore' || filename === '.env') {
    return { label: 'CFG', color: '#4ADE80', bg: 'rgba(74, 222, 128, 0.15)' };
  }
  if (lower === 'dockerfile' || lower.endsWith('.dockerfile')) {
    return { label: 'DOCKER', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
  }

  switch (ext) {
    // Web
    case 'js':
    case 'mjs':
    case 'cjs':
      return { label: 'JS', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' };
    case 'jsx':
      return { label: 'JSX', color: '#67E8F9', bg: 'rgba(103, 232, 249, 0.15)' };
    case 'ts':
      return { label: 'TS', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'tsx':
      return { label: 'TSX', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' };
    case 'html':
    case 'htm':
      return { label: 'HTML', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.15)' };
    case 'css':
      return { label: 'CSS', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'scss':
    case 'sass':
      return { label: 'SCSS', color: '#F472B6', bg: 'rgba(244, 114, 182, 0.15)' };
    case 'json':
      return { label: '{}', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' };
    case 'yaml':
    case 'yml':
      return { label: 'YAML', color: '#FB7185', bg: 'rgba(251, 113, 133, 0.15)' };
    case 'xml':
      return { label: 'XML', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
    case 'php':
      return { label: 'PHP', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.15)' };
    case 'rb':
      return { label: 'RUBY', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
    case 'graphql':
    case 'gql':
      return { label: 'GQL', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' };

    // DSA
    case 'c':
      return { label: 'C', color: '#93C5FD', bg: 'rgba(147, 197, 253, 0.15)' };
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'h':
    case 'hpp':
      return { label: 'C++', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' };
    case 'java':
      return { label: 'JAVA', color: '#F87171', bg: 'rgba(248, 113, 113, 0.15)' };
    case 'rs':
      return { label: 'RUST', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' };
    case 'go':
      return { label: 'GO', color: '#00ADD8', bg: 'rgba(0, 173, 216, 0.15)' };
    case 'kt':
    case 'kts':
      return { label: 'KT', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.15)' };
    case 'cs':
      return { label: 'C#', color: '#818CF8', bg: 'rgba(129, 140, 248, 0.15)' };
    case 'swift':
      return { label: 'SWIFT', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' };
    case 'dart':
      return { label: 'DART', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };

    // AI / ML
    case 'py':
    case 'ipynb':
    case 'pyw':
      return { label: 'PY', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'r':
      return { label: 'R', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' };
    case 'jl':
      return { label: 'JULIA', color: '#9333EA', bg: 'rgba(147, 51, 234, 0.15)' };
    case 'sql':
      return { label: 'SQL', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.15)' };
    case 'sh':
    case 'bash':
    case 'zsh':
      return { label: 'SH', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' };

    case 'md':
    case 'markdown':
      return { label: 'MD', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.15)' };
    default:
      return { label: 'TXT', color: '#8B949E', bg: 'rgba(139, 148, 158, 0.12)' };
  }
}

export function createDefaultProject(template: string = 'web'): FileNode[] {
  if (template === 'python') {
    return [
      {
        id: 'file_main_py',
        name: 'main.py',
        path: '/main.py',
        type: 'file',
        language: 'python',
        content: `# Kollab Python Workspace\ndef greet(name):\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("Kollab Developer"))\n`,
      },
      {
        id: 'file_readme_md',
        name: 'README.md',
        path: '/README.md',
        type: 'file',
        language: 'markdown',
        content: `# Kollab Workspace\n\nReal-time collaborative code pad.\nClick **▶ Run** above to execute code.\n`,
      },
    ];
  }

  if (template === 'dart') {
    return [
      {
        id: 'folder_app',
        name: 'app',
        path: '/app',
        type: 'folder',
        isOpen: true,
        children: [
          {
            id: 'file_main_dart',
            name: 'Main.dart',
            path: '/app/Main.dart',
            type: 'file',
            language: 'dart',
            content: `import 'package:flutter/material.dart';\n\nvoid main() {\n  runApp(const MyApp());\n}\n\nclass MyApp extends StatelessWidget {\n  const MyApp({Key? key}) : super(key: key);\n\n  @override\n  Widget build(BuildContext context) {\n    return MaterialApp(\n      title: 'Kollab Demo',\n      theme: ThemeData(),\n      home: const MyHomePage(),\n    );\n  }\n}\n`,
          },
          {
            id: 'file_builders_py',
            name: 'builders.py',
            path: '/app/builders.py',
            type: 'file',
            language: 'python',
            content: `# Build scripts for Kollab demo\nimport sys\n\nprint("Building project artifacts...")\n`,
          },
        ],
      },
      {
        id: 'file_gitignore',
        name: '.gitignore',
        path: '/.gitignore',
        type: 'file',
        language: 'plaintext',
        content: `.dart_tool/\nbuild/\n.idea/\n`,
      },
    ];
  }

  // Default Web App Template
  return [
    {
      id: 'file_index_html',
      name: 'index.html',
      path: '/index.html',
      type: 'file',
      language: 'html',
      content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="card">\n    <h1>Kollab Workspace</h1>\n    <p>Edit HTML, CSS, and JS simultaneously with your team.</p>\n    <button id="btn">Click me</button>\n    <p id="output"></p>\n  </div>\n  <script src="main.js"></script>\n</body>\n</html>\n`,
    },
    {
      id: 'file_style_css',
      name: 'style.css',
      path: '/style.css',
      type: 'file',
      language: 'css',
      content: `body {\n  background: #12161D;\n  color: #F0F3F6;\n  font-family: sans-serif;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n\n.card {\n  background: #161B22;\n  border: 1px solid #242B35;\n  border-radius: 8px;\n  padding: 24px;\n  text-align: center;\n}\n\nbutton {\n  background: #0284C7;\n  color: white;\n  border: none;\n  padding: 8px 16px;\n  border-radius: 4px;\n  cursor: pointer;\n}\nbutton:hover {\n  background: #0369A1;\n}\n`,
    },
    {
      id: 'file_main_js',
      name: 'main.js',
      path: '/main.js',
      type: 'file',
      language: 'javascript',
      content: `console.log("Kollab script loaded!");\n\nconst btn = document.getElementById("btn");\nconst output = document.getElementById("output");\n\nif (btn) {\n  btn.addEventListener("click", () => {\n    const msg = "Live interaction timestamp: " + new Date().toLocaleTimeString();\n    console.log(msg);\n    output.textContent = msg;\n  });\n}\n`,
    },
    {
      id: 'file_readme_md',
      name: 'README.md',
      path: '/README.md',
      type: 'file',
      language: 'markdown',
      content: `# Kollab Collaborative Workspace\n\n- Open multiple tabs above.\n- Click **▶ Run** to execute and view output in the live console.\n- Share the Room ID with classmates to collaborate in real-time.\n`,
    },
  ];
}

/**
 * Recursively find a file in the tree by path
 */
export function findFileByPath(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findFileByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Recursively update a file's content in the tree
 */
export function updateFileContentInTree(nodes: FileNode[], path: string, newContent: string): FileNode[] {
  return nodes.map((node) => {
    if (node.path === path) {
      return { ...node, content: newContent };
    }
    if (node.children) {
      return {
        ...node,
        children: updateFileContentInTree(node.children, path, newContent),
      };
    }
    return node;
  });
}

/**
 * Recursively find the first file (non-folder) in the tree
 */
export function findFirstFileNode(nodes: FileNode[]): FileNode | null {
  for (const node of nodes) {
    if (node.type === 'file') return node;
    if (node.children && node.children.length > 0) {
      const found = findFirstFileNode(node.children);
      if (found) return found;
    }
  }
  return null;
}
