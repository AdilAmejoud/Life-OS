# Life_OS v2 🧠

> A self-hosted personal operating system for a tech student — built with Docker, n8n, Ollama, and Node.js.

Life_OS is my local dashboard that centralizes learning progress, project tracking, automation workflows, and a personal AI assistant — all running on my own machine, no cloud required.

---

## 📸 Dashboard Pages

| Tab | What it shows | Status |
|---|---|---|
| Home | Tech blog RSS feeds | ✅ Live |
| Learning | Notion learning plan with live progress bars | ✅ Live |
| Content | Creator & dev blog RSS feeds | ✅ Live |
| DevOps | Cloud & infra news RSS | ✅ Live |
| Focus | Pomodoro timer + task management | ✅ Live |
| Tasks | Task manager connected to Notion | ✅ Live |
| AI Assistant | **NEXUS** — local AI terminal | 🔄 In progress |

---

## 🏗️ Architecture

```
Life_OS_v2/
├── backend/
│   ├── ai-assistant/       # NEXUS backend — connects to local Ollama LLM  (port 3700)
│   ├── task-api/           # Task management API                           (port 3100)
│   ├── notion-proxy/       # Notion API proxy with static fallback         (port 3456)
│   └── pomodoro/           # Pomodoro timer backend                        (port 3800)
├── config/
│   ├── glance.yml          # Main dashboard config
│   └── pages/              # One .yml file per dashboard tab
├── workflows/              # n8n automation workflows (importable JSON)
├── secrets/
│   └── .env.example        # Copy this → .env.production, never commit real secrets
└── docker-compose.yml
```

---

## 🛠️ Stack

| Tool | Role | Port |
|---|---|---|
| [Glance](https://github.com/glanceapp/glance) | Dashboard shell | 8090 |
| [n8n](https://n8n.io) | Automation workflows | 5678 |
| [Ollama](https://ollama.com) | Local LLM (qwen2.5-coder:1.5b) | 11434 |
| Node.js | Backend microservices | 3100 – 3800 |
| Docker Compose V2 | Orchestrates all services | — |

---

## ⚡ Quick Start

### Prerequisites
- Docker with Compose V2 — always use `docker compose` (not `docker-compose`)
- Node.js 18+
- [Ollama](https://ollama.com) installed and running locally

### 1. Clone
```bash
git clone https://github.com/AdilAmejoud/life-os.git
cd life-os
```

### 2. Configure secrets
```bash
cp secrets/.env.example secrets/.env.production
# Edit .env.production and fill in your API keys
```

### 3. Pull your Ollama model
```bash
ollama pull qwen2.5-coder:1.5b
```

### 4. Start everything
```bash
docker compose up -d
```

### 5. Open the dashboard
```
http://localhost:8090
```

---

## 🔄 Automation Workflows

All n8n workflows are exported as JSON in the [`workflows/`](./workflows/) folder.  
See [`workflows/README.md`](./workflows/README.md) for import instructions and detailed explanations.

| Workflow | Purpose |
|---|---|
| Notion Learning Plan → Glance | Live learning progress on dashboard |
| Notion Courses → Glance | Course completion percentage on dashboard |
| Notion Projects → Glance | Active projects status on dashboard |
| Keep Warm — Webhooks | Prevents n8n cold start timeouts |

---

## 🤖 NEXUS — AI Assistant

NEXUS is the built-in AI terminal. It connects to a local Ollama instance — everything stays on your machine.

**Design:** IDE aesthetic with 3 dark surfaces, JetBrains Mono for metadata, glassmorphism overlays, and 3 themes (navy / slate / light).

**Backend:** Live at port 3700 with full REST API (conversations, models, skills, tasks, n8n triggers).

**Frontend:** Being rebuilt from HTML → React. See [`backend/ai-assistant/`](./backend/ai-assistant/) for the current backend.

---

## 🔐 Security

- All secrets live in `secrets/.env.production` — **gitignored, never committed**
- Copy `secrets/.env.example` to get started
- GitHub token in `config/glance.yml` uses an environment variable — never hardcoded

---

## 📚 What I Learned Building This

- Docker Compose V2 multi-service orchestration
- n8n webhook automation and Notion API integration
- Building a REST API backend in Node.js with multiple microservices
- Connecting a local LLM (Ollama) to a custom backend
- Staging vs production environment separation for local development
- Managing secrets safely in a self-hosted environment

---

## 🗺️ Roadmap

- [x] Core dashboard with Glance
- [x] n8n + Notion live data integration
- [x] Local LLM backend (Ollama + Node.js)
- [x] Task manager, Pomodoro app
- [ ] NEXUS React frontend complete
- [ ] Slash commands (`/notion`, `/workflow`, `/linkedin`)
- [ ] CoderVerse script generator widget
- [ ] Smart Control System agents integration

---

## 👤 Author

**Adil Amejoud** — First-year ISIP Engineering Student @ ENSMR, Rabat, Morocco

[GitHub](https://github.com/AdilAmejoud) · [LinkedIn](https://linkedin.com/in/adil-amejoud) · [Instagram](https://instagram.com/coder_verse)