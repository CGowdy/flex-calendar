SHELL := /bin/bash

.PHONY: dev api web db db-down logs full-up full-down

## Run frontend and API with hot-reload
dev:
	bun run dev:full

## Run API only (hot-reload)
api:
	bun run dev:server

## Run Web only (hot-reload)
web:
	bun run dev

## Start Mongo (and mongo-express) for dev
db:
	docker compose -f infra/docker-compose.dev.yml up -d

## Stop dev DB stack
db-down:
	docker compose -f infra/docker-compose.dev.yml down

## Tail dev DB logs
logs:
	docker compose -f infra/docker-compose.dev.yml logs -f

## Bring up full NAS stack (Caddy, web, api, mongo)
full-up:
	cd infra && docker compose -f docker-compose.full.yml up -d --build

## Tear down full NAS stack
full-down:
	cd infra && docker compose -f docker-compose.full.yml down
