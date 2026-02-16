SHELL := /bin/bash

.PHONY: help setup backend frontend dev rebuild-vectors validate-contributions test-backend test-frontend clean

help:
	@echo "Available targets:"
	@echo "  make setup            Install backend/frontend dependencies and local env"
	@echo "  make backend          Run FastAPI backend on 127.0.0.1:8010"
	@echo "  make frontend         Run Next.js frontend on 127.0.0.1:3001"
	@echo "  make dev              Show two-terminal dev workflow"
	@echo "  make rebuild-vectors  Rebuild local vector store embeddings"
	@echo "  make validate-contributions  Validate contrib JSON templates"
	@echo "  make test-backend     Run backend smoke tests"
	@echo "  make test-frontend    Run frontend route smoke tests"
	@echo "  make clean            Remove local build artifacts"

setup:
	./scripts/setup.sh

backend:
	source .venv/bin/activate && python3 -m uvicorn services.api.main:app --host 127.0.0.1 --port 8010

frontend:
	cd apps/web && npm run dev -- --hostname 127.0.0.1 --port 3001

dev:
	@echo "Run in two terminals:"
	@echo "  Terminal 1: make backend"
	@echo "  Terminal 2: make frontend"

rebuild-vectors:
	source .venv/bin/activate && python3 services/api/services/vector_store.py

validate-contributions:
	python3 scripts/validate_contributions.py

test-backend:
	source .venv/bin/activate && pytest -q

test-frontend:
	cd apps/web && npm run test

clean:
	rm -rf apps/web/.next apps/web/node_modules .venv
	rm -f apps/web/tsconfig.tsbuildinfo
