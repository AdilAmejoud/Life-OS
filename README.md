# Life_OS v2 🧠

> A self-hosted personal operating system for a tech student — built with Docker, n8n, Ollama, and Node.js.

Life_OS centralizes learning progress, project tracking, automation workflows, and a personal AI assistant — all running on your own machine, no cloud required.

---

## 📸 Dashboard Pages

| Tab          | What it shows                                | Status  |
| ------------ | -------------------------------------------- | ------- |
| Home         | Tech blog RSS feeds                          | ✅ Live |
| Learning     | Notion learning plan with live progress bars | ✅ Live |
| Content      | Creator & dev blog RSS feeds                 | ✅ Live |
| DevOps       | Cloud & infra news RSS                       | ✅ Live |
| Focus        | Pomodoro timer + task management             | ✅ Live |
| Tasks        | Task manager connected to Notion             | ✅ Live |
| AI Assistant | **NEXUS** — local AI terminal                | ✅ Live |

---

## 🏗️ Architecture

```text
Life_OS/
├── apps/                          # Domain-driven microservices monorepo
│   ├── ai-assistant/              # NEXUS — React frontend + modular Node backend  | port 3700
│   │   ├── backend/
│   │   │   ├── routes/            # Express route handlers (chat, tasks, memory…)
│   │   │   ├── core/              # Orchestrator, tool loop, reasoning engine
│   │   │   ├── integrations/      # OpenRouter, MCP, n8n, Notion, web search
│   │   │   ├── context/           # System prompt assembly, instructions, user data
│   │   │   └── db/                # SQLite access, skills, tasks persistence
│   │   └── frontend/              # React + Vite SPA (served by the backend)
│   ├── task-manager/              # Task manager with Notion sync               | port 3100
│   │   ├── backend/
│   │   └── frontend/              # React + Vite
│   ├── pomodoro/                  # Pomodoro timer with task integration         | port 3800
│   │   ├── backend/
│   │   └── frontend/              # React + Vite
│   ├── notion-proxy/              # Notion API proxy with static fallback        | port 3456
│   │   └── backend/
│   ├── content-api/               # RSS & content aggregation API
│   │   └── backend/
│   ├── youtube-proxy/             # YouTube data proxy
│   │   └── backend/
│   └── super-productivity/        # Dockerized Super Productivity wrapper
│       └── backend/
├── config/                        # Glance dashboard configuration
│   ├── glance.yml                 # Main entry point
│   └── pages/                     # One .yml per dashboard tab
├── shared/                        # Shared SQLite DB and utilities (used by multiple apps)
├── workflows/                     # n8n automation workflows (importable JSON)
├── external/                      # Third-party git submodules (Super Productivity source)
├── docs/                          # Architecture docs and project context
├── scripts/                       # Standalone helper scripts
├── .secrets/
│   └── .env.example               # Copy → .env.production, never commit real secrets
└── docker-compose.yml             # Master orchestrator for all services
```

---

## 🛠️ Stack

| Tool                                                               | Role                   | Port        |
| ------------------------------------------------------------------ | ---------------------- | ----------- |
| [Glance](https://github.com/glanceapp/glance)                      | Dashboard shell        | 8090        |
| [n8n](https://n8n.io)                                              | Automation workflows   | 5678        |
| [Ollama](https://ollama.com) / [OpenRouter](https://openrouter.ai) | LLM inference          | 11434       |
| Node.js + Express                                                  | Backend microservices  | 3100 – 3800 |
| React + Vite                                                       | Interactive frontends  | —           |
| SQLite                                                             | Local data persistence | —           |
| Docker Compose V2                                                  | Service orchestration  | —           |

---

## ⚡ Quick Start

### Prerequisites

- Docker with Compose V2 (`docker compose`, not `docker-compose`)
- Node.js 18+
- [Ollama](https://ollama.com) running locally (optional — OpenRouter also supported)

### 1. Clone

```bash
git clone https://github.com/AdilAmejoud/Life-OS.git
cd Life-OS
```

### 2. Configure secrets

```bash
cp .secrets/.env.example .secrets/.env.production
# Fill in your API keys (Notion, OpenRouter, n8n…)
```

### 3. Start everything

```bash
docker compose up -d
```

### 4. Open the dashboard

http://localhost:8090

> To use a local LLM, install Ollama and run `ollama pull qwen2.5-coder:1.5b` before starting.

---

## 🤖 NEXUS — AI Assistant

NEXUS is the core of Life_OS. It's a personal AI terminal that runs on your machine and connects to the rest of your stack.

**Backend** (`apps/ai-assistant/backend/`) is a modular Express server with:

- A tool loop that chains LLM calls with function execution
- MCP (Model Context Protocol) integration for external tool servers
- Notion sync for memory and task management
- n8n webhook triggers for automation from chat
- OpenRouter support for cloud models + Ollama for local inference
- Full REST API: `/api/chat`, `/api/tasks`, `/api/skills`, `/api/memory`, `/api/models`, `/api/n8n`

**Frontend** (`apps/ai-assistant/frontend/`) is a React SPA with an IDE aesthetic: 3 dark surfaces, JetBrains Mono, glassmorphism overlays, command palette, sidebar panels for tasks/memory/workflows.

---

## 🔄 Automation Workflows

All n8n workflows are exported as JSON in [`workflows/`](./workflows/). See [`workflows/README.md`](./workflows/README.md) for import instructions.

| Workflow                      | Purpose                                  |
| ----------------------------- | ---------------------------------------- |
| Notion Learning Plan → Glance | Live learning progress bars on dashboard |
| Notion Courses → Glance       | Course completion percentage             |
| Notion Projects → Glance      | Active project status                    |
| Keep Warm                     | Prevents n8n cold-start timeouts         |

---

## 🔐 Security

- All secrets live in `.secrets/.env.production` — **gitignored, never committed**
- Copy `.secrets/.env.example` to get started
- GitHub token in `config/glance.yml` is injected via environment variable — never hardcoded

---

## 📚 What I Learned Building This

- Docker Compose V2 multi-service orchestration
- n8n webhook automation and Notion API integration
- Building modular REST APIs in Node.js (routes → core → integrations → db)
- LLM tool loops: chaining model calls with function execution
- MCP (Model Context Protocol) for AI tool integration
- React + Vite frontend development (hooks, component architecture)
- Monorepo architecture: migrating a flat codebase to a domain-driven `apps/` structure
- Secrets management and staging/production environment separation

---

## 🗺️ Roadmap

- [x] Core dashboard with Glance
- [x] n8n + Notion live data integration
- [x] Local LLM backend (Ollama + OpenRouter)
- [x] Task manager, Pomodoro app
- [x] NEXUS React frontend
- [x] Backend modularization (routes / core / integrations / db)
- [ ] Slash commands in NEXUS (`/notion`, `/workflow`, `/linkedin`)
- [ ] Fix YouTube widgets (Glance playlist_id bug)
- [ ] CoderVerse script generator widget
- [ ] Smart Control System agents (DevCoach, Creators)
- [ ] Daily summary widget on Home page
- [ ] Staging docker-compose profile

---

## 👤 Author

**Adil Amejoud** — First-year ISIP Engineering Student @ ENSMR, Rabat, Morocco

[GitHub](https://github.com/AdilAmejoud) · [LinkedIn](https://linkedin.com/in/adil-amejoud) · [Instagram](https://instagram.com/coder_verse)
