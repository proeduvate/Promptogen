"""Unit tests for /api/v1/library endpoints."""

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_get_folders():
    response = client.get("/api/v1/library/folders")
    assert response.status_code == 200
    folders = response.json()
    assert isinstance(folders, list)
    assert any(f["id"] == "all" for f in folders)


def test_get_filters():
    response = client.get("/api/v1/library/filters")
    assert response.status_code == 200
    filters = response.json()
    assert isinstance(filters, list)
    filter_ids = [f["id"] for f in filters]
    assert "model" in filter_ids
    assert "tag" in filter_ids


def test_list_and_create_prompt():
    # List prompts
    response = client.get("/api/v1/library/prompts?tab=all")
    assert response.status_code == 200
    data = response.json()
    assert "prompts" in data
    assert data["total"] >= 1

    # Create new prompt
    new_payload = {
        "title": "Automated Test Prompt",
        "model": "GPT-4o",
        "folder": "marketing",
        "tags": ["Testing", "Auto"],
        "score": 88,
        "sections": [
            {"id": "role", "label": "SYSTEM / ROLE", "type": "text", "content": "You are a test agent."},
            {"id": "task", "label": "TASK", "type": "text", "content": "Run automated checks."},
        ],
    }
    create_res = client.post("/api/v1/library/prompts", json=new_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["title"] == "Automated Test Prompt"
    prompt_id = created["id"]

    # Get single prompt
    get_res = client.get(f"/api/v1/library/prompts/{prompt_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == prompt_id

    # Toggle favorite
    fav_res = client.patch(f"/api/v1/library/prompts/{prompt_id}/favorite")
    assert fav_res.status_code == 200
    assert fav_res.json()["favorite"] is True

    # Delete prompt
    del_res = client.delete(f"/api/v1/library/prompts/{prompt_id}")
    assert del_res.status_code == 204
