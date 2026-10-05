<div align="center">

# ⚡ Kollab

**The real-time collaborative cloud IDE for teams who build together.**

Multiplayer Code Editing • Live Interactive Terminal • Multi-Language Runner • BYOK AI Assistant • WebRTC Voice & Chat

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Monaco Editor](https://img.shields.io/badge/Monaco_Editor-1E1E1E?style=flat-square&logo=visualstudiocode&logoColor=007ACC)](https://microsoft.github.io/monaco-editor/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Docker](https://img.shields.io/badge/Docker_Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

[Live Demo](https://kollab-production.up.railway.app) • [Deploy Guide](HOSTING.md) • [Report Bug](https://github.com/Rudr4nksh/Kollab/issues)

</div>

---

## 💡 Overview

**Kollab** is an open-source, browser-based collaborative developer environment designed for pair programming, team hackathons, interviews, and technical workshops. It combines the power of VS Code's editor engine with real-time CRDT synchronization, containerized multi-language code execution, an integrated interactive terminal, voice/text channels, and client-side AI pair programming.

---

## ✨ Key Features

### 👥 Real-Time Multiplayer Collaboration
- **CRDT Conflict-Free Synchronization**: Powered by [Yjs](https://github.com/yjs/yjs) and WebSockets for zero-conflict concurrent editing.
- **Live Remote Cursors & Selections**: Track teammates' cursor movements, active files, and text selections in real-time.
- **Participant Presence & State**: Room activity tracking, custom avatars, host controls, and automatic room cleanup when everyone departs.

### ⚡ Multi-Language Code Runner & Interactive Terminal
- **Native Compilers & Runtimes**: Out-of-the-box execution for **Python, C++, Java, Go, Rust, JavaScript, and TypeScript**.
- **Interactive STDIN over WebSockets**: Stream input/output in real time for competitive programming prompts and interactive command-line programs.
- **Integrated Terminal**: VS Code-grade terminal emulator with custom shell commands, history navigation, and tab completion.
- **GitHub Integration**: Direct git execution in-terminal with 1-click OAuth authentication to push and pull repositories without manual personal access tokens.

### 🤖 Built-In AI Assistant (BYOK)
- **Bring Your Own Key**: Secure client-side storage for **Anthropic (Claude 3.5 Sonnet)**, **Google Gemini (1.5 Flash / 2.0 Flash)**, and **OpenAI (GPT-4o)** keys.
- **Context-Aware Code Assistance**: Chat, explain bugs, generate boilerplate, and review code directly within the IDE.
- **Interactive Diff Review Modal**: Visual side-by-side git diff review with 1-click code application.

### 📁 Modern Workspace & File Explorer
- **Multi-File & Folder Trees**: Recursive folder navigation, inline file/folder creation, and file extension detection.
- **Drag-and-Drop Import**: Drag entire folders or files directly into the workspace with Discord/Linear-style glassmorphism drop overlays.
- **File-Level Undo/Redo**: Full `Ctrl+Z` and `Ctrl+Y` support for restored and deleted files with interactive undo toasts.
- **Live HTML/CSS/JS Sandbox**: Dedicated preview tab to build, render, and test front-end web applications live.

### 💬 Team Voice & Chat
- **Discord-Style Channel Chat**: Integrated room text channel for sharing links, snippets, and updates.
- **WebRTC Voice Rooms**: Peer-to-peer low-latency spatial voice channels without external third-party servers.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Monaco Editor, Tailwind CSS, Lucide Icons, Yjs (`y-monaco`, `y-protocols`) |
| **Backend** | Node.js, Express, TypeScript, Socket.IO, WebSockets, Prisma ORM, SQLite |
| **Execution Engine** | Native containerized runners (`g++`, `python3`, `openjdk`, `golang`, `rustc`, `node`) |
| **Realtime** | WebSocket bidirectional streams, WebSockets STDIN/STDOUT runner, WebRTC Mesh Voice |
| **Deployment** | Multi-stage Docker, Railway, Render Blueprint, Docker Compose |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://www.npmjs.com/) (v9 or newer)
- *(Optional for native local compilation)*: `g++`, `python3`, `default-jdk`, `golang`, `rustc`

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Rudr4nksh/Kollab.git
   cd Kollab
   ```

2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```

3. **Initialize the database**:
   ```bash
   npm run setup
   ```

4. **Start the development servers**:
   ```bash
   npm run dev
   ```

The app will be available at:
- **Client**: `http://localhost:5173`
- **Server API & WebSocket**: `http://localhost:4000`

---

## 🐳 Docker & Production Deployment

Kollab includes a multi-stage `Dockerfile` equipped with all compilers and production build optimizations.

### Run with Docker Compose

```bash
docker compose up -d --build
```
Your instance will be running on `http://localhost:4000`.

### Cloud Deployment (Railway / Render / VPS)

- **Railway**: Connect your GitHub repository. Railway detects the `Dockerfile` automatically. Mount a persistent volume at `/app/prisma` for zero-configuration database persistence.
- **Render**: Use the provided `render.yaml` blueprint with 1-click deployment.
- **VPS (Ubuntu/Debian)**: Run behind Caddy or Nginx reverse proxy with automatic SSL.

> For complete step-by-step production hosting instructions, see [HOSTING.md](HOSTING.md).

---

## 🔑 Environment Variables Reference

Create a `.env` file in the project root or configure these variables in your deployment dashboard:

| Variable | Default | Required | Description |
|---|---|:---:|---|
| `PORT` | `4000` | No | Server port for backend API and static frontend assets |
| `NODE_ENV` | `development` | No | Set to `production` for container builds |
| `DATABASE_URL` | `file:./prod.db` | No | SQLite database path or PostgreSQL connection string |
| `CLIENT_URL` | *Same origin* | No | Public URL of the app for CORS and OAuth redirects |
| `GITHUB_CLIENT_ID` | — | No | GitHub OAuth App ID for integrated terminal git login |
| `GITHUB_CLIENT_SECRET` | — | No | GitHub OAuth App Secret |
| `GEMINI_API_KEY` | — | No | System fallback key for Google Gemini AI models |
| `ANTHROPIC_API_KEY` | — | No | System fallback key for Claude 3.5 Sonnet |
| `OPENAI_API_KEY` | — | No | System fallback key for OpenAI models |

*Note: Users can also input their own AI API keys directly inside the IDE without server configuration.*

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'add some amazing feature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/Rudr4nksh">Rudranksh Parial</a>
</div>
