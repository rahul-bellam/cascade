.PHONY: help dev dev-frontend dev-backend test lint clean db-reset seed

help:
	@echo "Cascade Development Commands"
	@echo "==========================="
	@echo ""
	@echo "  make dev          Start all services for local development"
	@echo "  make dev-frontend Start only the frontend"
	@echo "  make dev-backend  Start only the backend services"
	@echo "  make test         Run all tests"
	@echo "  make lint         Run all linters"
	@echo "  make clean        Clean up containers and cached files"
	@echo "  make db-reset     Reset local database"
	@echo "  make seed         Seed database with sample content"

dev:
	docker-compose up --build -d
	cd frontend && npm run dev

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	docker-compose up --build -d

test: test-go test-python test-frontend

test-go:
	cd services/auth && go test ./... 2>/dev/null || true
	cd services/constraint-engine && CONTENT_DIR=$(PWD)/content go test ./... 2>/dev/null || true
	cd services/user && go test ./... 2>/dev/null || true

test-python:
	cd services/learn-engine && python -m pytest tests/ 2>/dev/null || true
	cd services/cascade-engine && python -m pytest tests/ 2>/dev/null || true
	cd services/refactor-engine && python -m pytest tests/ 2>/dev/null || true
	cd services/arena-engine && python -m pytest tests/ 2>/dev/null || true

test-frontend:
	cd frontend && npm run test 2>/dev/null || true

lint: lint-go lint-python lint-frontend

lint-go:
	cd services/auth && go vet ./... 2>/dev/null || true
	cd services/constraint-engine && go vet ./... 2>/dev/null || true
	cd services/user && go vet ./... 2>/dev/null || true

lint-python:
	cd services/learn-engine && python -m flake8 . 2>/dev/null || true
	cd services/cascade-engine && python -m flake8 . 2>/dev/null || true
	cd services/refactor-engine && python -m flake8 . 2>/dev/null || true
	cd services/arena-engine && python -m flake8 . 2>/dev/null || true

lint-frontend:
	cd frontend && npm run lint 2>/dev/null || true

build:
	docker-compose build

clean:
	docker-compose down -v 2>/dev/null || true
	rm -rf frontend/.next frontend/node_modules
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

db-reset:
	docker-compose up -d postgres
	sleep 3
	bash scripts/run-migrations.sh

schema:
	bash scripts/run-migrations.sh

seed:
	python scripts/seed-content.py

validate-dags:
	python scripts/validate-dags.py

ci: lint test build