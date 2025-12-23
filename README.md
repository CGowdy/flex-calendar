# Flex Calendar

A flexible, chain-aware calendar for any sequential workflow—lesson plans, content pipelines, training programs, or recovery schedules.  
The app lets you define layered plans (reference, progress, exceptions), generate template items, and quickly reflow linked layers while respecting weekends and exception blocks.

## Stack

- **Frontend:** Vue 3, TypeScript, Pinia, TanStack Query, Vite  
- **Backend:** Fastify, Mongoose (MongoDB)  
- **Tooling:** Bun, Vitest, Testing Library, ESLint, Prettier, Docker Compose

## Getting Started

### Requirements

- Bun 1.1+  
- Node.js 20.19+ (or 22.12+) optional for fallback  
- Docker (optional, for containerized workflows)  
- MongoDB (local or via Docker)

### Installation

```bash
bun install
cp env.example .env # customise as needed
```

### Local Development (fastest): DB in Docker, FE/BE native

1) Start MongoDB (and mongo-express UI):

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

2) Run the API and Web with hot-reload:

```bash
bun run dev:full
# or separately:
# bun run dev          # web only (Vite)
# bun run dev:server   # api only (Bun runtime)
```

- Frontend: http://localhost:5173  
- API: http://localhost:3333 (Vite proxies `/api` → API)
 - Mongo Express: http://localhost:8083 (login user/pass: admin/admin)

#### Switch between dev and full-stack envs

```bash
# Write dev-friendly .env (DB-only in Docker)
scripts/switch-mode.sh dev

# Write full-stack .env for NAS compose (mongo/api/web/caddy)
scripts/switch-mode.sh full
```

### NAS / “prod-ish” (full Docker stack)

When you want to host on your NAS, use the full stack with Caddy reverse proxy:

```bash
cd infra
docker compose -f docker-compose.full.yml up -d --build
```

Edit `infra/Caddyfile` to use your NAS IP/hostname. Caddy routes `/api` to the API container and serves the SPA from the web container.

### Continuous Integration

GitHub Actions runs lint, type-check, unit + server tests, and build on pushes/PRs.
- Workflow: `.github/workflows/ci.yml`

## Scripts

| Command | Description |
| ------- | ----------- |
| `bun run dev:full` | Run Vite and Fastify concurrently |
| `bun run build` | Type-check and build both frontend and backend |
| `bun run build:server` | Compile server TypeScript to `dist/server` |
| `bun run start:server:bun` | Run compiled Fastify server with Bun |
| `bun run seed:sample` | Seed MongoDB with a sample Flex Calendar |
| `bun run test:unit` | Run frontend + backend Vitest suite |
| `bun run test:server` | Run server-only tests with Node environment |
| `bun run lint` | ESLint (auto-fix enabled) |

### Component Tests (Playwright)

- Install browsers once: `npx playwright install --with-deps`
- Run headless: `bun run test:ct`
- Run with UI: `bun run test:ct:ui`

Playwright CT config lives in `playwright-ct.config.ts`. Tests are placed under `__ct__` folders and named `*.ct.spec.ts`. Example added for `SetupWizard.vue`.

## Testing

- Frontend and composable tests live alongside features under `src/features/**/__tests__`.  
- Backend service tests live in `src/server/__tests__` and use `mongodb-memory-server` to avoid external dependencies.

```bash
bun run test:unit    # all tests
bun run test:server  # server-focused tests only
```

## Project Structure Highlights

```
src/
  features/calendar/
    api/                     # REST client helpers
    components/              # Vue components (dashboard, wizard, timeline, drawer)
    composables/             # Pinia store + schedule adjuster
    types/                   # Shared calendar DTOs
    views/                   # Route-level view component
  server/
    config/                  # Env + Mongo connection
    models/                  # Mongoose schemas
    services/                # Business logic for calendars
    routes/                  # Fastify routes
    scripts/                 # Seed sample data
```

## Seeding Data

To insert a starter calendar (helpful for demos/testing):

```bash
bun run seed:sample
```

This uses the same `MONGODB_URI` configured for the API.

## Environment Variables

See `env.example` for defaults. Key values:

- `MONGODB_URI` – Mongo connection string (dev: `mongodb://root:example@localhost:27018/flex-calendar?authMechanism=DEFAULT`)  
- `PORT` / `HOST` – Fastify listener  
- `CORS_ORIGIN` – Optional in dev (Vite proxy handles same-origin)  
- `VITE_API_URL` – Optional override when not using the Vite proxy

## Accessibility & UI Verification

- `SetupWizard` collects the basic calendar info and grouping tracks.  
- The dashboard shows timeline stats, an interactive grouping grid, and a detail drawer for precise shifts.  
- `useScheduleAdjuster` powers optimistic updates so UI interactions feel instant before API confirmation.

## Intended Workflow

See `docs/workflow.md` for a concise, repeatable workflow across devices/agents, including environment setup, local vs Docker dev flows, testing, and data seeding.

## Product Spec

See `docs/product-spec.md` for the problem statement, core flows, acceptance criteria, and milestones for this calendar.

## Next Steps

- Layer-specific presets (fitness plans, editorial calendars, training ramps)  
- Catch-up planner visualizations and manual adjustments  
- Expanded drag & drop interactions in `DraggableCalendarGrid`
