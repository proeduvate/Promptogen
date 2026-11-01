"""Unit tests for Authentication and IP-level rate limiting."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi import status
from fastapi.testclient import TestClient

from main import app
from services.auth_store import auth_store

MOCK_QUESTIONS = [
    {"id": 1, "question": "What is the platform?", "options": ["Web", "Mobile"]},
]


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clean_ip_usage():
    auth_store.reset_ip("203.0.113.42")
    auth_store.reset_ip("198.51.100.99")
    auth_store.reset_ip("testclient")
    yield
    auth_store.reset_ip("203.0.113.42")
    auth_store.reset_ip("198.51.100.99")
    auth_store.reset_ip("testclient")


def test_register_and_login_flow(client):
    email = "alice@example.com"
    pwd = "SecurePassword123"

    # Register
    reg_resp = client.post("/api/v1/auth/register", json={
        "name": "Alice Wonderland",
        "email": email,
        "password": pwd,
    })
    assert reg_resp.status_code == status.HTTP_201_CREATED
    reg_data = reg_resp.json()
    assert "token" in reg_data
    assert reg_data["user"]["email"] == email
    token = reg_data["token"]

    # Duplicate registration fails with 400
    dup_resp = client.post("/api/v1/auth/register", json={
        "name": "Alice Duplicate",
        "email": email,
        "password": pwd,
    })
    assert dup_resp.status_code == status.HTTP_400_BAD_REQUEST

    # Login with correct password
    login_resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": pwd,
    })
    assert login_resp.status_code == status.HTTP_200_OK
    assert "token" in login_resp.json()

    # Login with wrong password fails with 401
    bad_login = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "WrongPassword!",
    })
    assert bad_login.status_code == status.HTTP_401_UNAUTHORIZED

    # Authenticated /me endpoint
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == status.HTTP_200_OK
    assert me_resp.json()["email"] == email

    # Unauthenticated /me returns 401
    anon_me = client.get("/api/v1/auth/me")
    assert anon_me.status_code == status.HTTP_401_UNAUTHORIZED


def test_google_auth(client):
    resp = client.post("/api/v1/auth/google", json={
        "email": "bob.developer@gmail.com",
        "name": "Bob Developer",
        "picture": "https://lh3.googleusercontent.com/a/demo-photo",
        "google_id": "google-sub-12345",
    })
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["user"]["email"] == "bob.developer@gmail.com"
    assert data["user"]["auth_provider"] == "google"
    assert "token" in data


def test_google_auth_with_access_token(client):
    mock_userinfo = {
        "email": "verified.google@example.com",
        "name": "Verified Google User",
        "picture": "https://lh3.googleusercontent.com/photo",
        "sub": "google-sub-998877",
    }

    class DummyResponse:
        def __init__(self, status_code, data):
            self.status_code = status_code
            self._data = data

        def json(self):
            return self._data

    async def mock_get(url, *args, **kwargs):
        if "userinfo" in url:
            return DummyResponse(200, mock_userinfo)
        return DummyResponse(200, {"aud": "", "azp": ""})

    with patch("httpx.AsyncClient.get", side_effect=mock_get):
        resp = client.post("/api/v1/auth/google", json={
            "access_token": "ya29.mock_valid_access_token_123",
        })
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data["user"]["email"] == "verified.google@example.com"
        assert data["user"]["name"] == "Verified Google User"
        assert "token" in data


def test_rate_limit_status_endpoint(client):
    guest_ip = "198.51.100.99"
    resp = client.get(
        "/api/v1/auth/rate-limit-status",
        headers={"x-forwarded-for": guest_ip},
    )
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["is_authenticated"] is False
    assert data["limit"] == 2
    assert data["used"] == 0
    assert data["remaining"] == 2
    assert data["locked"] is False


def test_guest_ip_level_lock_system(client):
    guest_ip = "203.0.113.42"
    headers = {"x-forwarded-for": guest_ip}

    with patch("api.pipeline.clarify_workflow") as mock_workflow, \
         patch("api.pipeline.database.create_prompt_creation", new=AsyncMock(return_value=None)):
        mock_workflow.ainvoke = AsyncMock(return_value={"questions": MOCK_QUESTIONS, "prompt_title": "Test Title"})

        # Generation 1: Success (1/2)
        r1 = client.post("/api/v1/pipeline/start", json={"query": "Design an app"}, headers=headers)
        assert r1.status_code == status.HTTP_200_OK

        # Generation 2: Success (2/2)
        r2 = client.post("/api/v1/pipeline/start", json={"query": "Design a website"}, headers=headers)
        assert r2.status_code == status.HTTP_200_OK

        # Generation 3: Locked (exceeds 2/2) -> HTTP 429 Too Many Requests
        r3 = client.post("/api/v1/pipeline/start", json={"query": "Design a logo"}, headers=headers)
        assert r3.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Guest generation limit reached" in r3.json()["detail"]


def test_authenticated_user_bypasses_ip_lock(client):
    user_ip = "203.0.113.42"
    # Seed 2 usages for this IP to lock it for guests
    auth_store.record_guest_generation(user_ip)
    auth_store.record_guest_generation(user_ip)
    assert auth_store.get_ip_status(user_ip)["locked"] is True

    # Register/Login an authenticated user
    reg = client.post("/api/v1/auth/register", json={
        "name": "Power User",
        "email": "poweruser@example.com",
        "password": "Password123!",
    })
    token = reg.json()["token"]

    auth_headers = {
        "x-forwarded-for": user_ip,
        "Authorization": f"Bearer {token}",
    }

    with patch("api.pipeline.clarify_workflow") as mock_workflow, \
         patch("api.pipeline.database.create_prompt_creation", new=AsyncMock(return_value=None)):
        mock_workflow.ainvoke = AsyncMock(return_value={"questions": MOCK_QUESTIONS, "prompt_title": "Test Title"})

        # Authenticated user succeeds even though guest IP is locked
        resp = client.post("/api/v1/pipeline/start", json={"query": "Build a CRM system"}, headers=auth_headers)
        assert resp.status_code == status.HTTP_200_OK


def test_reset_rate_limit_endpoint(client):
    test_ip = "192.0.2.77"
    auth_store.record_guest_generation(test_ip)
    auth_store.record_guest_generation(test_ip)
    assert auth_store.get_ip_status(test_ip)["locked"] is True

    # Call reset endpoint
    resp = client.post("/api/v1/auth/reset-rate-limit", headers={"x-forwarded-for": test_ip})
    assert resp.status_code == status.HTTP_200_OK
    assert auth_store.get_ip_status(test_ip)["locked"] is False
    assert auth_store.get_ip_status(test_ip)["used"] == 0
