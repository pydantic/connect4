# Stage 1: Frontend builder
FROM node:18 AS frontend-builder

# Set working directory
WORKDIR /app

# Copy package files for frontend
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

# Install frontend dependencies
RUN npm install

# Copy frontend source code
COPY frontend ./frontend/

# Build frontend
RUN npm run build

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
