"""Unit tests for the Clarification Engine (Developer 1 scope).

Test cases covered:
1. Valid query — happy path end-to-end
2. Empty query — Pydantic rejects it before the service is called
3. Very long query — service handles it gracefully
4. LLM returns invalid JSON — ParseError is raised
5. LLM timeout — LLMTimeoutError propagates to HTTP 504
6. LLM returns fewer than 10 questions — valid as long as ≥ 1
7. Proper response schema — response structure matches ClarificationResponse
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock

from fastapi import status
from fastapi.testclient import TestClient

from main import app
from api.clarification import get_clarification_service
from core.constants import MAX_QUERY_LENGTH
from core.exceptions import LLMTimeoutError, ParseError
from schemas.clarification import ClarificationResponse
from services.clarification.parser import ClarificationParser
from services.clarification.service import ClarificationService


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_llm_json(n: int = 3) -> str:
    """Build a well-formed LLM response JSON string with *n* questions."""
    questions = [
        {
            "id": i,
            "question": f"Sample question {i}?",
            "options": ["Option A", "Option B", "Option C"],
        }
        for i in range(1, n + 1)
    ]
    return json.dumps({"questions": questions})


def _mock_client(return_value: str = "") -> MagicMock:
    """Return a generic mock client whose chat_completion is an AsyncMock.

    Provider-agnostic — works regardless of LLM_PROVIDER setting.
    """
    client = MagicMock()
    client.chat_completion = AsyncMock(return_value=return_value)
    return client


def _test_client_with_mock(mock_client: MagicMock) -> TestClient:
    """Override the clarification service dependency and return a TestClient."""

    def _override() -> ClarificationService:
        return ClarificationService(client=mock_client)

    app.dependency_overrides[get_clarification_service] = _override
    client = TestClient(app)
    return client


def _restore_overrides() -> None:
    app.dependency_overrides.clear()


# ── Test cases ─────────────────────────────────────────────────────────────────

class TestClarificationEndpoint:
    """Integration-style tests against the FastAPI router."""

    def teardown_method(self) -> None:
        _restore_overrides()

    # 1. Valid query — happy path
    def test_valid_query_returns_questions(self) -> None:
        llm_response = _make_llm_json(n=3)
        mock = _mock_client(llm_response)
        client = _test_client_with_mock(mock)

        resp = client.post("/api/v1/clarification", json={"query": "Build a fitness app"})

        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        assert "questions" in body
        assert len(body["questions"]) == 3

    # 2. Empty query — rejected by Pydantic (422)
    def test_empty_query_returns_422(self) -> None:
        client = TestClient(app)
        resp = client.post("/api/v1/clarification", json={"query": ""})
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 3. Very long query — accepted and processed
    def test_very_long_query_is_processed(self) -> None:
        long_query = "Design a mobile app " * 100  # ~2000 chars, within limit
        llm_response = _make_llm_json(n=5)
        mock = _mock_client(llm_response)
        client = _test_client_with_mock(mock)

        resp = client.post("/api/v1/clarification", json={"query": long_query})

        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.json()["questions"]) == 5

    # 4. LLM returns invalid JSON — 422
    def test_invalid_llm_json_returns_422(self) -> None:
        mock = _mock_client("This is not JSON at all.")
        client = _test_client_with_mock(mock)

        resp = client.post("/api/v1/clarification", json={"query": "Build a website"})

        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 5. LLM timeout — 504
    def test_llm_timeout_returns_504(self) -> None:
        mock = MagicMock()
        mock.chat_completion = AsyncMock(side_effect=LLMTimeoutError("Timed out"))
        client = _test_client_with_mock(mock)

        resp = client.post("/api/v1/clarification", json={"query": "Build a website"})

        assert resp.status_code == status.HTTP_504_GATEWAY_TIMEOUT

    # 6. LLM returns fewer than 10 questions — still valid
    def test_fewer_than_10_questions_is_valid(self) -> None:
        llm_response = _make_llm_json(n=2)  # minimum valid count
        mock = _mock_client(llm_response)
        client = _test_client_with_mock(mock)

        resp = client.post("/api/v1/clarification", json={"query": "Write a blog post"})

        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.json()["questions"]) == 2

    # 7. Proper response schema
    def test_response_matches_clarification_response_schema(self) -> None:
        llm_response = _make_llm_json(n=4)
        mock = _mock_client(llm_response)
        client = _test_client_with_mock(mock)

        resp = client.post("/api/v1/clarification", json={"query": "Create an e-commerce site"})

        assert resp.status_code == status.HTTP_200_OK
        parsed = ClarificationResponse.model_validate(resp.json())
        assert len(parsed.questions) == 4
        for i, q in enumerate(parsed.questions, start=1):
            assert q.id == i
            assert isinstance(q.question, str) and q.question
            assert isinstance(q.options, list)
            assert 2 <= len(q.options) <= 5


class TestClarificationService:
    """Unit tests for ClarificationService in isolation."""

    @pytest.mark.asyncio
    async def test_service_returns_response_on_valid_llm_output(self) -> None:
        mock = _mock_client(_make_llm_json(n=3))
        service = ClarificationService(client=mock)

        result = await service.generate_questions("Build a fitness app")

        assert isinstance(result, ClarificationResponse)
        assert len(result.questions) == 3

    @pytest.mark.asyncio
    async def test_service_raises_parse_error_on_bad_json(self) -> None:
        mock = _mock_client("not json")
        service = ClarificationService(client=mock)

        with pytest.raises(ParseError):
            await service.generate_questions("Build a fitness app")

    @pytest.mark.asyncio
    async def test_service_propagates_llm_timeout(self) -> None:
        mock = MagicMock()
        mock.chat_completion = AsyncMock(side_effect=LLMTimeoutError("timeout"))
        service = ClarificationService(client=mock)

        with pytest.raises(LLMTimeoutError):
            await service.generate_questions("Build a fitness app")


class TestClarificationParser:
    """Unit tests for ClarificationParser directly."""

    def setup_method(self) -> None:
        self.parser = ClarificationParser()

    def test_parses_valid_json(self) -> None:
        result = self.parser.parse(_make_llm_json(n=3))
        assert len(result.questions) == 3

    def test_parses_json_in_markdown_fence(self) -> None:
        raw = f"```json\n{_make_llm_json(n=2)}\n```"
        result = self.parser.parse(raw)
        assert len(result.questions) == 2

    def test_raises_parse_error_on_invalid_json(self) -> None:
        with pytest.raises(ParseError):
            self.parser.parse("definitely not json")

    def test_raises_parse_error_when_questions_key_missing(self) -> None:
        with pytest.raises(ParseError):
            self.parser.parse(json.dumps({"wrong_key": []}))

    def test_truncates_questions_beyond_max(self) -> None:
        result = self.parser.parse(_make_llm_json(n=12))  # 12 > MAX (10)
        assert len(result.questions) == 10

    def test_truncates_options_beyond_max(self) -> None:
        data = {
            "questions": [
                {
                    "id": 1,
                    "question": "Q?",
                    "options": ["A", "B", "C", "D", "E", "F"],  # 6 > MAX (5)
                }
            ]
        }
        result = self.parser.parse(json.dumps(data))
        assert len(result.questions[0].options) == 5

    def test_raises_parse_error_when_options_too_few(self) -> None:
        data = {
            "questions": [
                {"id": 1, "question": "Q?", "options": ["Only one"]}
            ]
        }
        with pytest.raises(ParseError):
            self.parser.parse(json.dumps(data))

    def test_ids_are_normalised_sequentially(self) -> None:
        data = {
            "questions": [
                {"id": 99, "question": "Q1?", "options": ["A", "B"]},
                {"id": 0, "question": "Q2?", "options": ["X", "Y"]},
            ]
        }
        result = self.parser.parse(json.dumps(data))
        assert result.questions[0].id == 1
        assert result.questions[1].id == 2


class TestQueryValidation:
    """Edge-case tests for the request schema."""

    def test_query_exceeding_max_length_is_rejected(self) -> None:
        from schemas.clarification import ClarificationRequest
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            ClarificationRequest(query="x" * (MAX_QUERY_LENGTH + 1))

    def test_whitespace_only_query_is_rejected(self) -> None:
        from schemas.clarification import ClarificationRequest
        from pydantic import ValidationError

        # After strip() the query becomes empty → min_length=1 fails
        with pytest.raises(ValidationError):
            ClarificationRequest(query="   ")
