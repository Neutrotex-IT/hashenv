# HashEnv Docker runner commands
# Usage: make <target>   or   ./scripts/run.ps1 <command>

COMPOSE_DEV  := docker compose -f docker-compose.dev.yml
COMPOSE_PROD := docker compose -f docker-compose.yml
COMPOSE_TEST := docker compose -f docker-compose.test.yml

.PHONY: help dev dev-watch dev-down prod prod-down prod-logs test test-backend test-frontend test-unit test-mongo-up test-mongo-down build

help:
	@echo "HashEnv Docker commands:"
	@echo "  make dev              Start dev stack (hot reload, Atlas via backend/.env)"
	@echo "  make dev-watch        Start dev stack with compose file watch"
	@echo "  make dev-down         Stop dev stack"
	@echo "  make prod             Build and start production-like local stack"
	@echo "  make prod-down        Stop production-like stack"
	@echo "  make prod-logs        Tail production-like logs"
	@echo "  make test             Run backend + frontend tests"
	@echo "  make test-backend     Backend tests (tmpfs MongoDB replica set)"
	@echo "  make test-frontend    Frontend Vitest in Docker"
	@echo "  make test-unit        Backend unit tests only (no MongoDB)"
	@echo "  make test-mongo-up    Start test MongoDB on localhost:27017"
	@echo "  make test-mongo-down  Stop test MongoDB"
	@echo "  make build            Build production images"

dev:
	$(COMPOSE_DEV) up --build

dev-watch:
	$(COMPOSE_DEV) up --watch --build

dev-down:
	$(COMPOSE_DEV) down

prod:
	$(COMPOSE_PROD) up --build -d

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f

build:
	$(COMPOSE_PROD) build

test: test-backend test-frontend

test-backend:
	$(COMPOSE_TEST) run --rm --build backend-test

test-frontend:
	$(COMPOSE_TEST) --profile frontend run --rm --build frontend-test

test-unit:
	$(COMPOSE_TEST) --profile unit run --rm --build backend-unit

test-mongo-up:
	$(COMPOSE_TEST) up mongo -d --wait

test-mongo-down:
	$(COMPOSE_TEST) down -v
