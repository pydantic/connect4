# Stage 1: Frontend builder
FROM node:18 AS frontend-builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# Set working directory
WORKDIR /app

# Copy package files for workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
COPY c4ai/package.json ./c4ai/

# Install frontend dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source code
COPY frontend ./frontend/

# Build frontend
RUN pnpm run build

# Stage 2: Python backend
FROM python:3.13-alpine

WORKDIR /app

RUN pip install uv

ENV UV_COMPILE_BYTECODE=1

COPY pyproject.toml uv.lock ./

RUN uv sync --locked --no-install-project --no-dev

# Copy backend files
COPY backend ./backend/

# Copy built frontend from the frontend-builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Run the backend without the --reload flag
CMD ["uv", "run", "--no-sync", "uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8000"]
