# SyncPad (Kollab)

> Live Collaborative Workspace & Code Pad for Students.

A real-time collaborative workspace and code pad featuring simultaneous document editing, CRDT conflict resolution (Yjs), remote cursor synchronization with line highlights, typing/presence indicators, live activity feed, automatic host reassignment, and SQLite persistence via Prisma.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Monaco Editor, Socket.IO Client, Yjs (`y-monaco`, `y-protocols`), Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Socket.IO, Yjs, SQLite with Prisma ORM, bcryptjs.
- **Design Philosophy**: Minimalist developer tool aesthetic (VS Code inspired, dark palette `#0D0E12`, `#12131A`, subtle borders `#242632`, restrained purple accent `#7357E8`).

## Getting Started

### 1. Installation

```bash
npm run install:all
```

### 2. Database Setup

```bash
npm run db:push
```

### 3. Run Development Servers

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
