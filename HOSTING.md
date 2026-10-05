# 🚀 Kollab Production Deployment & Hosting Guide

Kollab is a real-time collaborative workspace with native compilers (C++, Python, Java, Go, Rust), real-time WebSockets, WebRTC voice channels, and Monaco code editing.

Because Kollab runs **native compilers** and **long-lived WebSockets**, it is containerized with a production multi-stage `Dockerfile`.

---

## ⚡ Option 1: Railway (Easiest — 2-Minute Setup)

Railway automatically detects the `Dockerfile`, builds all compilers, provides persistent volumes, and gives you a free HTTPS domain.

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your **`Kollab`** repository.
4. In project settings, add a **Volume** mounted at `/app/prisma` (to persist the SQLite database across redeploys).
5. Click **Generate Domain** in **Networking** to get your public HTTPS URL (e.g., `https://kollab-production.up.railway.app`).
6. Done! Railway automatically builds and deploys.

---

## ⚡ Option 2: Render.com (1-Click Blueprint)

1. Go to [render.com](https://render.com) and sign in.
2. Click **Blueprints** → **New Blueprint Instance**.
3. Connect your GitHub repository. Render reads `render.yaml` automatically.
4. Click **Apply**.
5. Render deploys the Docker container with persistent disk and health checks.

---

## ⚡ Option 3: VPS Self-Hosting (DigitalOcean, Hetzner, AWS EC2, Linode)

If you have a Linux server (Ubuntu/Debian) with Docker and Docker Compose installed:

```bash
# 1. Clone repository
git clone https://github.com/Rudr4nksh/Kollab.git
cd Kollab

# 2. Build and launch with Docker Compose
docker compose up -d --build

# 3. View logs
docker compose logs -f
```

The application will be live at `http://YOUR_SERVER_IP:4000`.

### Adding Free SSL (Caddy Reverse Proxy)
In `/etc/caddy/Caddyfile`:
```caddy
kollab.yourdomain.com {
    reverse_proxy localhost:4000
}
```
Run `systemctl reload caddy` for instant automatic Let's Encrypt HTTPS!

---

## 🔑 Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port for the fullstack server |
| `NODE_ENV` | `production` | Production environment flag |
| `DATABASE_URL` | `file:./prod.db` | SQLite file URL or PostgreSQL connection string |
| `GITHUB_CLIENT_ID` | *Optional* | GitHub OAuth App client ID for 1-click GitHub push |
| `GITHUB_CLIENT_SECRET` | *Optional* | GitHub OAuth App client secret |
| `CLIENT_URL` | *Same origin* | Public URL for OAuth callbacks and CORS |
| `ANTHROPIC_API_KEY` | *Optional* | System default Anthropic key (users can also bring their own in UI) |
| `GEMINI_API_KEY` | *Optional* | System default Google Gemini key |
| `OPENAI_API_KEY` | *Optional* | System default OpenAI key |
