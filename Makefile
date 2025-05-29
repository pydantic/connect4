.DEFAULT_GOAL := all

.PHONY: .uv
.uv: ## Check that uv is installed
	@uv --version || echo 'Please install uv: https://docs.astral.sh/uv/getting-started/installation/'

.PHONY: .pre-commit
.pre-commit: ## Check that pre-commit is installed
	@pre-commit -V || echo 'Please install pre-commit: https://pre-commit.com/'

.PHONY: .deno
.deno: ## Check that deno is installed
	@deno --version > /dev/null 2>&1 || (printf "\033[0;31m✖ Error: deno is not installed, but is needed for mcp-run-python\033[0m\n    Please install deno: https://docs.deno.com/runtime/getting_started/installation/\n" && exit 1)

.PHONY: install
install: .uv .pre-commit .deno ## Install the package, dependencies, and pre-commit for local development
	uv sync --frozen
	pre-commit install --install-hooks

.PHONY: format-frontend
format-frontend: ## Format frontend code
	npm run format

.PHONY: format-c4ai
format-c4ai: ## Format the code
	cd c4ai && deno fmt
	cd c4ai && deno lint
	cd c4ai && deno check main.ts

.PHONY: format-py
format-py: ## Format python code
	uv run ruff format
	uv run ruff check --fix --fix-only

.PHONY: format
format: format-frontend format-c4ai format-py ## Format all code

.PHONY: typecheck-frontend
typecheck-frontend: ## Run static type checking for frontend code
	npm run typecheck

.PHONY: typecheck-c4ai
typecheck-c4ai: ## Run static type checking for c4ai code
	cd c4ai && deno check main.ts

.PHONY: typecheck-py
typecheck-py: ## Run static type checking for python code
	@# PYRIGHT_PYTHON_IGNORE_WARNINGS avoids the overhead of making a request to github on every invocation
	PYRIGHT_PYTHON_IGNORE_WARNINGS=1 uv run pyright

.PHONY: typecheck
typecheck: typecheck-frontend typecheck-c4ai typecheck-py ## Run static type checking for all code

.PHONY: backend-dev
backend-dev: ## Run the bakcend
	DATABASE_URL=postgresql://postgres:postgres@localhost:54320/connect4 uv run uvicorn backend.server:app --reload

.PHONY: all
all: format lint typecheck
