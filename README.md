# My Abeka Calendar

Homeschool calendar planner for aligning Abeka lesson pacing with the realities of family life.  
The app lets you import/seed schedules, manage multiple grouping tracks (Abeka, Student A/B, Holidays), and quickly reschedule lesson days with domino-style shifts.

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

### Local Development

Run the frontend and API together (Bun-first):

```bash
bun run dev:full
```

- Frontend: http://localhost:5173  
- API: http://localhost:3333 (proxied at `/api` from the Vite dev server)

You can also run the dev servers individually:

```bash
bun run dev          # frontend only (Vite)
bun run dev:server   # backend API (Bun TS runtime, hot reload)

# Fallback (Node + tsx) if needed:
npm run dev:server:node
```

### Docker Compose

A full stack (client, API, MongoDB) can be launched with:

```bash
docker-compose up --build
```

This mounts the current workspace; dependencies are installed inside the containers each time they start using Bun. Stop with `Ctrl+C` or `docker-compose down`.

## Scripts

| Command | Description |
| ------- | ----------- |
| `bun run dev:full` | Run Vite and Fastify concurrently |
| `bun run build` | Type-check and build both frontend and backend |
| `bun run build:server` | Compile server TypeScript to `dist/server` |
| `bun run start:server:bun` | Run compiled Fastify server with Bun |
| `bun run seed:sample` | Seed MongoDB with a sample Abeka calendar |
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

- `MONGODB_URI` – Mongo connection string  
- `PORT` / `HOST` – Fastify listener  
- `CORS_ORIGIN` – Allowed origins for dev  
- `VITE_API_URL` – Optional override when the frontend isn’t using the Vite proxy

## Accessibility & UI Verification

- `SetupWizard` collects the basic calendar info and grouping tracks.  
- The dashboard shows timeline stats, an interactive grouping grid, and a detail drawer for precise shifts.  
- `useScheduleAdjuster` powers optimistic updates so UI interactions feel instant before API confirmation.

## Intended Workflow

See `docs/workflow.md` for a concise, repeatable workflow across devices/agents, including environment setup, local vs Docker dev flows, testing, and data seeding.

## Product Spec

See `docs/product-spec.md` for the problem statement, core flows, acceptance criteria, and milestones for this calendar.

## Next Steps

- Integrate Abeka ICS feed import  
- Add catch-up plan visualizations  
- Expand drag & drop interactions in `DraggableCalendarGrid`
