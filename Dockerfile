# Stage 1: Frontend builder
FROM node:18 AS frontend-builder

# Set working directory
WORKDIR /app

# Copy package files for frontend
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

# Install frontend dependencies
RUN npm install

# Need the following to build for arm64...
RUN npm install --no-save @rollup/rollup-linux-arm64-gnu

# Copy frontend source code
COPY frontend ./frontend/

# Build frontend
RUN npm run build

# Stage 2: Python backend
FROM python:3.12-slim

# Install curl for uv installation
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Download the latest installer
ADD https://astral.sh/uv/install.sh /uv-installer.sh

# Run the installer then remove it
RUN sh /uv-installer.sh && rm /uv-installer.sh

# Ensure the installed binary is on the `PATH`
ENV PATH="/root/.local/bin/:$PATH"

# Set working directory
WORKDIR /app

# Copy backend files
COPY backend ./backend/
COPY pyproject.toml uv.lock ./

# Copy built frontend from the frontend-builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Install backend dependencies
RUN uv sync --frozen

# Run the backend without the --reload flag
CMD ["uv", "run", "uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8000"]
