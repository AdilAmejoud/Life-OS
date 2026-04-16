# Nexus AI Assistant Architecture

This document describes the modular architecture of the `backend/ai-assistant/` service, restructured to resolve technical debt and separate concerns into logical layers.

## Core Layers

1. **`server.js`**
   - The thin entry point. Boots the Express/HTTP server, runs the frontend build check, and loops through the sub-routers to handle incoming requests. 

2. **`routes/`**
   - Contains modular route handlers. Each file is dedicated to a specific API group (e.g., `/api/chat/`, `/api/n8n/`, `/api/mcp/`).
   - Keeps `server.js` clean and routes isolated.
   - Handlers extract HTTP logic and delegate business logic to the integration or core layers.

3. **`integrations/`**
   - Home for external API clients and external services.
   - `mcp.js`: The MCP Tool Registry and execution hub.
   - `n8n.js`: The n8n Webhook triggering client.
   - `notion.js`: The Notion API client (for queries).
   - `ollama.js`: The LLM generation core (streaming, static text generation).

4. **`core/`**
   - Handles the fundamental decision-making loops of the AI proxy.
   - `orchestrator.js`: Makes decisions about chaining or parallelizing tool flows.
   - `reasoning.js`: Builds dynamic reasoning/chain-of-thought prompts.

5. **`context/`**
   - State and system boundary management for interactions.
   - `systemPrompt.js`: Injects active contexts, constructs the prompt, and extracts facts/confidence mappings.
   - `instructions.js` & `userData.js`: Provides hooks to manipulate in-DB system context definitions.

6. **`db/`** (formerly `data/`)
   - Replaces the generic `data/` folder to prevent permissions conflicts with root-owned SQLite DB.
   - `db/index.js` manages migrations, schema, and handles raw query interfaces for all other subsystems.
   - `skills.js` & `tasks.js`: Directly interact with DB storage models. Contains logic specifically bound to internal data persistence.

## Legacy Marker System
To ensure compatibility, original files in the root folder have been preserved but tagged with a `// MIGRATED` module marker. They should not be actively modified, but are left intact pending final deployment pipeline updates.
