# Intended Workflow

This document captures the intended day-to-day workflow so contributors (including agents) stay aligned across devices.

## Tooling Baseline

- Package manager and script runner: Bun 1.1+
- Frontend: Vite + Vue 3 + TypeScript
- Backend: Fastify + Mongoose (MongoDB)
- Tests: Vitest (+ jsdom where needed)
- Lint/Format: ESLint + Prettier

## Environment Setup

1) Install Bun:
   - macOS (Homebrew): `brew install oven-sh/bun/bun`
   - Windows (PowerShell): `powershell -c "irm bun.sh/install.ps1 | iex"`
   - Linux: `curl -fsSL https://bun.sh/install | bash`
2) Install deps and set env:
   - `bun install`
   - `cp env.example .env` and adjust values as needed

MongoDB can be local or via Docker. For tests, we use `mongodb-memory-server`.

## Running the App (Local)

- Run both servers:
  - `bun run dev:full`
  - Frontend: http://localhost:5173
  - API: http://localhost:3333 (also proxied at `/api` from Vite)
- Individually:
  - Frontend: `bun run dev`
  - API: `bun run dev:server` (hot reload via Bun)
  - Node fallback for API: `npm run dev:server:node`

## Running the App (Docker)

Use Docker Compose for a fully containerized stack (client, API, MongoDB):

```bash
docker-compose up --build
```

The containers use Bun for installing and running. The workspace is mounted; stop with `Ctrl+C` or `docker-compose down`.

## Build and Start (Production-like)

```bash
bun run build
# run with Bun
bun run start:server:bun
# or with Node
npm run start:server
```

Artifacts:
- Client build: `dist/` (Vite)
- Server build: `dist/server/`

## Tests and Linting

- All tests: `bun run test:unit`
- Server-focused: `bun run test:server`
- Lint: `bun run lint`
- Type-check: `bun run type-check`

CI-style guidance:
- Run `bun run type-check && bun run lint && bun run test:unit` before opening a PR or committing across devices.

## Data and Seeding

- Configure `MONGODB_URI` in `.env`. For ephemeral dev data, set `MONGODB_URI=memory` (spins up an in-memory server for tests; use carefully in dev).
- Seed sample data:

```bash
bun run seed:sample
```

## Ports and URLs

- Vite dev server: `http://localhost:5173`
- API server: `http://localhost:3333`
- Vite proxy forwards `/api` to the API target (`VITE_API_URL`, defaults to API server).
  - Health check is at `/health` (not `/api/health`).
  - Calendars API is under `/api/calendars`. Leave `VITE_API_URL` unset to use the proxy, or if you set it, include the `/api` suffix, e.g. `http://localhost:3333/api`.

Auth note for Mongo (dev):
- When using Dockerized Mongo with the root user from `.env.mongo`, use `authSource=admin` in `MONGODB_URI`, e.g.  
  `mongodb://root:example@localhost:27018/flex-calendar?authSource=admin&authMechanism=DEFAULT`

## Branching and PRs (Lightweight)

- Create feature branches: `feat/<short-description>` or `fix/<short-description>`
- Keep changes small and focused; update this doc if workflow shifts.

## Agent Notes

- Prefer Bun for running scripts. Use Node fallback only if a package is temporarily incompatible.
- Keep `.env` in sync across machines by copying from `env.example` and adjusting secrets locally.
- If you add a new script, ensure both local and Docker flows are updated (scripts and `docker-compose.yml`).


