import type { FileNode, SupportedLanguage } from '../types/index.ts';

export function getLanguageFromFilename(filename: string): SupportedLanguage {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'py':
      return 'python';
    case 'dart':
      return 'dart';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'java':
      return 'java';
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return 'plaintext';
  }
}

export function getFileBadgeInfo(filename: string): { label: string; color: string; bg: string } {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (filename === '.gitignore') {
    return { label: 'git', color: '#4ADE80', bg: 'rgba(74, 222, 128, 0.15)' };
  }
  switch (ext) {
    case 'js':
      return { label: 'JS', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' };
    case 'ts':
    case 'tsx':
      return { label: 'TS', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'py':
      return { label: 'PY', color: '#FCD34D', bg: 'rgba(252, 211, 77, 0.15)' };
    case 'dart':
      return { label: 'DART', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'html':
      return { label: 'HTML', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.15)' };
    case 'css':
      return { label: 'CSS', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'json':
      return { label: '{}', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' };
    case 'md':
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
