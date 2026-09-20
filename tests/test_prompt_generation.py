"""Unit tests for the Prompt Generation Engine (Developer 2 scope).

Test cases covered:
1. Valid request - happy path end-to-end
2. Empty original_query - Pydantic rejects it (422)
3. Empty answers list - Pydantic rejects it (422)
4. LLM returns invalid JSON - ParseError -> 422
5. LLM timeout - LLMTimeoutError -> 504
6. LLM API error - LLMError -> 502
7. Response schema matches PromptGenerationResponse
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock

from fastapi import status
from fastapi.testclient import TestClient

from main import app
from api.prompt_generation import get_prompt_generation_service
from core.exceptions import LLMError, LLMTimeoutError
from schemas.prompt_generation import PromptGenerationResponse
from services.prompt_generation.service import PromptGenerationService


def _make_llm_json(title: str = "Test Prompt Title") -> str:
    return json.dumps({
        "title": title,
        "optimized_prompt": "You are an expert assistant. Your task is to help the user build a fitness tracking mobile app.",
    })


def _valid_request_body() -> dict:
    return {
        "original_query": "Build a fitness app",
        "answers": [
            {
                "question_id": 1,
                "question": "What platform?",
                "selected_option": "iOS and Android",
                "custom_input": None,
            }
        ],
    }


def _mock_client(return_value: str = "") -> MagicMock:
    client = MagicMock()
    client.chat_completion = AsyncMock(return_value=return_value)
    return client


def _test_client_with_mock(mock_client: MagicMock) -> TestClient:
    def _override() -> PromptGenerationService:
        return PromptGenerationService(client=mock_client)
    app.dependency_overrides[get_prompt_generation_service] = _override
    return TestClient(app)


def _restore_overrides() -> None:
    app.dependency_overrides.clear()


class TestPromptGenerationEndpoint:

    def teardown_method(self) -> None:
        _restore_overrides()

    def test_valid_request_returns_optimized_prompt(self) -> None:
        mock = _mock_client(_make_llm_json())
        client = _test_client_with_mock(mock)
        resp = client.post("/api/v1/generate-prompt", json=_valid_request_body())
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        assert "optimized_prompt" in body
        assert "title" in body
        assert "original_query" in body
        assert body["original_query"] == "Build a fitness app"

    def test_empty_query_returns_422(self) -> None:
        client = TestClient(app)
        body = _valid_request_body()
        body["original_query"] = ""
        resp = client.post("/api/v1/generate-prompt", json=body)
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_empty_answers_returns_422(self) -> None:
        client = TestClient(app)
        body = _valid_request_body()
        body["answers"] = []
        resp = client.post("/api/v1/generate-prompt", json=body)
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_invalid_llm_json_returns_422(self) -> None:
        mock = _mock_client("This is not JSON at all.")
        client = _test_client_with_mock(mock)
        resp = client.post("/api/v1/generate-prompt", json=_valid_request_body())
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_llm_timeout_returns_504(self) -> None:
        mock = MagicMock()
        mock.chat_completion = AsyncMock(side_effect=LLMTimeoutError("Timed out"))
        client = _test_client_with_mock(mock)
        resp = client.post("/api/v1/generate-prompt", json=_valid_request_body())
        assert resp.status_code == status.HTTP_504_GATEWAY_TIMEOUT

    def test_llm_error_returns_502(self) -> None:
        mock = MagicMock()
        mock.chat_completion = AsyncMock(side_effect=LLMError("API error"))
        client = _test_client_with_mock(mock)
        resp = client.post("/api/v1/generate-prompt", json=_valid_request_body())
        assert resp.status_code == status.HTTP_502_BAD_GATEWAY

    def test_response_matches_schema(self) -> None:
        mock = _mock_client(_make_llm_json("My Custom Title"))
        client = _test_client_with_mock(mock)
        resp = client.post("/api/v1/generate-prompt", json=_valid_request_body())
        assert resp.status_code == status.HTTP_200_OK
        parsed = PromptGenerationResponse.model_validate(resp.json())
        assert parsed.title == "My Custom Title"
        assert len(parsed.optimized_prompt) > 0
        assert parsed.original_query == "Build a fitness app"


class TestPromptGenerationService:

    @pytest.mark.asyncio
    async def test_service_returns_response_on_valid_output(self) -> None:
        from schemas.prompt_generation import PromptGenerationRequest, AnsweredQuestion
        mock = _mock_client(_make_llm_json())
        service = PromptGenerationService(client=mock)
        request = PromptGenerationRequest(
            original_query="Build a fitness app",
            answers=[AnsweredQuestion(question_id=1, question="Platform?", selected_option="iOS")],
        )
        result = await service.generate_prompt(request)
        assert isinstance(result, PromptGenerationResponse)
        assert result.title
        assert result.optimized_prompt

    @pytest.mark.asyncio
    async def test_service_raises_parse_error_on_bad_json(self) -> None:
        from core.exceptions import ParseError
        from schemas.prompt_generation import PromptGenerationRequest, AnsweredQuestion
        mock = _mock_client("not json")
        service = PromptGenerationService(client=mock)
        request = PromptGenerationRequest(
            original_query="Build a fitness app",
            answers=[AnsweredQuestion(question_id=1, question="Platform?", selected_option="iOS")],
        )
        with pytest.raises(ParseError):
            await service.generate_prompt(request)
