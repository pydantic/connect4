.DEFAULT_GOAL := all

.PHONY: .uv  # Check that uv is installed
.uv:
	@uv --version || echo 'Please install uv: https://docs.astral.sh/uv/getting-started/installation/'

.PHONY: install  # Install the package, dependencies, and pre-commit for local development
install: .uv
	uv sync --frozen
	npm install

.PHONY: format
format: ## Format the code
	uv run ruff format
	uv run ruff check --fix --fix-only
	npm run format

.PHONY: lint
lint: ## Lint the code
	uv run ruff format --check
	uv run ruff check
	npm run lint

.PHONY: typecheck
typecheck: ## Run static type checking
	@# PYRIGHT_PYTHON_IGNORE_WARNINGS avoids the overhead of making a request to github on every invocation
	PYRIGHT_PYTHON_IGNORE_WARNINGS=1 uv run pyright
	npm run typecheck

.PHONY: backend-dev
backend-dev: ## Run the bakcend
	uv run uvicorn backend.server:app --reload

.PHONY: all
all: format lint typecheck
