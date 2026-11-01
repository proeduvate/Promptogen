"""Tests for Vercel deployment entrypoint and adapted endpoints."""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

import importlib.util
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

root_dir = Path(__file__).resolve().parent.parent.parent
index_path = root_dir / "api" / "index.py"

spec = importlib.util.spec_from_file_location("vercel_api_index", str(index_path))
vercel_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vercel_module)
app = vercel_module.app


@pytest.fixture
def client():
    return TestClient(app)


def test_vercel_entrypoint_app_loaded():
    """Verify that api/index.py exposes the FastAPI app with configured metadata."""
    assert app.title == "PromptoGen AI Service"


def test_root_and_health_endpoints(client):
    """Verify all health and discovery endpoints are accessible."""
    # Root paths
    for path in ["/", "/api", "/api/v1"]:
        res = client.get(path)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "service" in data

    # Health check paths
    for path in ["/health", "/api/health", "/api/v1/health"]:
        res = client.get(path)
        assert res.status_code == 200
        assert res.json()["status"] == "ok"


def test_api_v1_models_endpoint(client):
    """Verify the /api/v1/models endpoint returns the free tier models."""
    res = client.get("/api/v1/models")
    assert res.status_code == 200
    data = res.json()
    assert "models" in data
    assert len(data["models"]) >= 1


def test_cors_allows_vercel_domains(client):
    """Verify CORS preflight accepts any *.vercel.app domain."""
    headers = {
        "Origin": "https://promptogen-preview-abc123.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
    }
    res = client.options("/api/v1/auth/login", headers=headers)
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "https://promptogen-preview-abc123.vercel.app"
    assert res.headers.get("access-control-allow-credentials") == "true"


def test_cors_allows_localhost_domains(client):
    """Verify CORS preflight accepts localhost dev ports."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
    }
    res = client.options("/api/v1/models", headers=headers)
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"
