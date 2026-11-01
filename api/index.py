"""Vercel serverless function entrypoint for Promptogen FastAPI backend."""

import os
import sys
from pathlib import Path

# Resolve directory paths
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"
backend_api_dir = backend_dir / "api"

# Ensure backend directory is in sys.path
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# When Vercel imports 'api.index', Python initializes the top-level 'api' package.
# Extend its __path__ so that internal submodules in backend/api (auth, pipeline, etc.) resolve properly.
if "api" in sys.modules and hasattr(sys.modules["api"], "__path__"):
    if str(backend_api_dir) not in sys.modules["api"].__path__:
        sys.modules["api"].__path__.insert(0, str(backend_api_dir))

from main import app  # noqa: E402
