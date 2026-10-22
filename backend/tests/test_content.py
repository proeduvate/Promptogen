"""Unit tests for /api/v1/content endpoints."""

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_get_content_meta():
    response = client.get("/api/v1/content/meta")
    assert response.status_code == 200
    data = response.json()
    assert "app_title" in data
    assert "example_chips" in data
    assert len(data["example_chips"]) > 0
    assert "feature_cards" in data
    assert "strength" in data
    assert data["strength"]["score"] > 0


def test_get_wizard_schema():
    response = client.get("/api/v1/content/wizard-schema")
    assert response.status_code == 200
    data = response.json()
    assert "steps" in data
    assert len(data["steps"]) >= 4
    step_ids = [s["id"] for s in data["steps"]]
    assert "goal" in step_ids
    assert "context" in step_ids
