# Promptogen - Effective Prompt Delivery Platform

Promptogen is an AI-powered service and dashboard that turns vague user ideas into structured, high-quality prompts with quality scoring and analytics.

---

## 🛠️ Quick Start

### 1. Backend Setup (using `uv`)

The backend is a FastAPI application managed with [`uv`](https://github.com/astral-sh/uv).

#### Install `uv` (if not already installed)
On macOS via Homebrew:
```bash
brew install uv
```
Or via the official standalone installer:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

#### Run with `uv`
```bash
cd backend

# Create a virtual environment with Python 3.13 or 3.12:
uv venv --python 3.13

# Install dependencies (including dev tools):
uv pip install -r requirements.txt
# or sync directly with pyproject.toml:
uv sync

# Configure environment variables:
cp .env.example .env
# Edit .env and supply your GROQ_API_KEY, OPENAI_API_KEY, and DATABASE_URL

# Apply database migrations to PostgreSQL:
uv run alembic upgrade head

# Start the server:
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- **Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### 2. Frontend Setup

The frontend is built with React 18, Vite, and Tailwind CSS v4.

```bash
cd frontend

# Install dependencies:
npm install

# Start Vite dev server:
npm run dev
```

- **Web Dashboard**: [http://localhost:5173](http://localhost:5173)
