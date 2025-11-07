# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Connect Four game demo showcasing PydanticAI and Pydantic Logfire capabilities. Features human vs AI and AI vs AI gameplay with multiple LLM model support. Live at https://logfire.run.

**IMPORTANT:** ALWAYS USE THE LOGFIRE MCP SERVER WHEN YOU'RE ASKED TO INVESTIGATE BEHAVIOUR, E.G. FIND BUGS OR ERRORS OR FIND PERFORMANCE ISSUES.
## Development Commands

### Initial Setup
```bash
make install              # Install all dependencies (Python, Node, pre-commit hooks)
docker compose up -d db   # Start PostgreSQL database
```

### Running Services in Development
```bash
# Backend (port 8000)
export LOGFIRE_TOKEN=<token>
export LOGFIRE_BASE_URL=https://logfire-us.pydantic.dev/  # or https://logfire-eu.pydantic.dev/
make backend-dev

# Frontend (port 3000)
npm run dev

# C4AI minimax service (port 9000) - usually not needed in dev
cd c4ai && npm run dev
```

### Code Quality
```bash
make format              # Format all code (Python + TypeScript)
make typecheck           # Type check all code
make lint                # Lint C4AI service

# Individual commands
make format-py           # Python with ruff
make format-frontend     # Frontend with prettier
make format-c4ai         # C4AI with biome
make typecheck-py        # Python with pyright
make typecheck-frontend  # Frontend with tsc
make typecheck-c4ai      # C4AI with tsc
```

### Production Build
```bash
npm run build            # Build frontend for production (outputs to frontend/dist)
```

## Architecture

### Three-Tier System
1. **Backend** (Python/FastAPI) - Game logic, AI orchestration, API
2. **Frontend** (SolidJS/Vite) - Interactive UI, client-side tracing
3. **C4AI** (Node.js/Express) - Minimax algorithm microservice
4. **Spider** - Background worker generating synthetic traffic

### Backend (`backend/`)

**Core Files:**
- `server.py` - FastAPI app with Logfire instrumentation
- `api.py` - REST endpoints for game operations
- `game.py` - Connect Four game logic (6x7 board, win detection)
- `agent.py` - PydanticAI agent with tool-based move selection
- `db.py` - PostgreSQL connection pooling and queries
- `c4model.py` - Custom PydanticAI model wrapping minimax service

**Key Patterns:**
- All game state persisted in PostgreSQL (`games` and `moves` tables)
- PydanticAI agents use tool-based output with validation and retries
- Logfire traces all operations (FastAPI, PydanticAI, asyncpg, httpx)
- Static files served from `frontend/dist` in production
- Schema auto-initializes on startup (no migrations)

**API Endpoints:**
- `GET /api/models` - List available AI models
- `GET /api/games/start` - Initialize new game
- `GET /api/games/{game_id}/state` - Get game state
- `POST /api/games/{game_id}/move` - Make a move
- `POST /api/client-traces` - Proxy browser traces to Logfire

**Supported AI Models:**
- OpenAI: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini
- Anthropic: claude-opus-4-0, claude-3-7-sonnet-latest, claude-3-5-haiku-latest
- Google Vertex: gemini-2.5-pro-preview-03-25, gemini-2.0-flash
- Groq: llama-3.3-70b-versatile, deepseek-r1-distill-llama-70b
- Local: c4 (minimax via c4ai service)

### Frontend (`frontend/`)

**Technology:**
- SolidJS with TypeScript (strict mode)
- Vite dev server with proxy to backend (`/api` -> `http://localhost:8000`)
- Logfire browser tracing via OpenTelemetry auto-instrumentation

**Key Files:**
- `src/App.tsx` - Main app with routing
- `src/HomePage.tsx` - Landing page
- `src/PlayerSelection.tsx` - Model selection UI
- `src/HumanAIPlay.tsx` - Human vs AI gameplay
- `src/AivsAiPlay.tsx` - AI vs AI gameplay
- `src/ai-service.ts` - API client layer
- `src/Instrumentation.tsx` - Logfire browser tracing setup

**Routes:**
- `/` - Home page
- `/connect4` - Player/model selection
- `/connect4/human-vs-ai/:gameId` - Human vs AI game
- `/connect4/ai-vs-ai/:gameId` - AI vs AI game

### C4AI Service (`c4ai/`)

Standalone Node.js microservice implementing optimal Connect Four moves using minimax algorithm from `@kenrick95/c4` library.

- Runs on port 9000
- POST / - Accepts array of moves, returns optimal next column
- Instrumented with Logfire Node.js SDK
- Used via `c4model.py` as a PydanticAI model

### Database Schema

**games table:**
- `id` (uuid, primary key)
- `status` (text: playing, pink-win, orange-win, draw)
- `orange_ai` (text, required)
- `pink_ai` (text, nullable - null for human player)
- `created_at` (timestamp)

**moves table:**
- `id` (serial, primary key)
- `game_id` (uuid, foreign key)
- `player` (text: pink or orange)
- `column_index` (integer, 0-6)
- `created_at` (timestamp)

**Note:** Schema runs on every startup via `schema.sql` (idempotent with IF NOT EXISTS).

## Code Style & Conventions

- **Python:** Single quotes, 120 char lines, ruff formatting, pyright strict
- **TypeScript:** 2 space indent, single quotes, 119 char lines, prettier
- **Pre-commit hooks:** Enforce formatting, type checking, and linting
- **Async/await:** Used throughout (Python asyncio, JavaScript async)
- **Type safety:** Strict TypeScript and Pyright modes enabled

## Deployment

- **Docker Compose:** Services for app, c4ai, spider, and db
- **Render.com:** Multi-service deployment (web services + worker + managed PostgreSQL)
- **Multi-stage Dockerfile:** Builds frontend then packages with Python backend
- **Domain:** logfire.run

## Observability

Full Pydantic Logfire integration across all services:
- Backend: FastAPI, PydanticAI, asyncpg, httpx instrumentation
- Frontend: Browser tracing with OpenTelemetry auto-instrumentation
- C4AI: Node.js Logfire SDK
- Distributed tracing with trace correlation across services
- Browser traces proxied through backend endpoint

## Important Notes

- Python 3.12+ required
- Node.js 24.1.0+ required (for experimental TypeScript support in c4ai)
- PydanticAI 0.2.3+ required for agent functionality
- ALWAYS USE THE LOGFIRE MCP SERVER WHEN YOU'RE ASKED TO INVESTIGATE BEHAVIOUR, E.G. FIND BUGS OR ERRORS OR FIND PERFORMANCE ISSUES.
