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

    def test_adaptive_sections_and_attachments(self) -> None:
        custom_payload = json.dumps({
            "title": "JWT Auth API",
            "optimized_prompt": "### ROLE\nYou are a senior backend engineer.\n\n### REQUIREMENTS\n- Auth with JWT\n- Fast execution",
            "sections": [
                {"id": "role", "label": "ROLE & PERSONA", "type": "text", "content": "You are a senior backend engineer."},
                {"id": "requirements", "label": "REQUIREMENTS", "type": "numbered", "items": [{"text": "Auth with JWT"}]},
            ],
            "required_attachments": [
                {
                    "name": "Database Schema DDL",
                    "type": "schema",
                    "description": "SQL schema DDL with users table",
                    "required": True,
                    "format_recommendation": ".sql"
                }
            ]
        })
        mock = _mock_client(custom_payload)
        client = _test_client_with_mock(mock)
        resp = client.post("/api/v1/generate-prompt", json=_valid_request_body())
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert len(data["sections"]) == 2
        assert data["sections"][0]["label"] == "ROLE & PERSONA"
        assert len(data["required_attachments"]) == 1
        assert data["required_attachments"][0]["name"] == "Database Schema DDL"
        assert data["required_attachments"][0]["format_recommendation"] == ".sql"


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

    @pytest.mark.asyncio
    async def test_service_handles_nested_code_fences_in_prompt(self) -> None:
        """Ensure code fences (e.g. ```typescript) inside the prompt don't break JSON extraction."""
        from schemas.prompt_generation import PromptGenerationRequest, AnsweredQuestion
        llm_raw = (
            '{\n'
            '  "title": "React Architecture",\n'
            '  "optimized_prompt": "### 1. ROLE\\nArchitect.\\n\\n### 2. CODE EXAMPLE\\n```typescript\\nconst x: number = 42;\\n```\\n",\n'
            '  "required_attachments": []\n'
            '}'
        )
        mock = _mock_client(llm_raw)
        service = PromptGenerationService(client=mock)
        request = PromptGenerationRequest(
            original_query="Build a React app",
            answers=[AnsweredQuestion(question_id=1, question="Language?", selected_option="TypeScript")],
        )
        result = await service.generate_prompt(request)
        assert result.title == "React Architecture"
        assert "const x: number = 42;" in result.optimized_prompt
        assert len(result.sections) >= 2

    @pytest.mark.asyncio
    async def test_service_repairs_truncated_llm_json(self) -> None:
        """Ensure truncated JSON from LLM token limit is safely recovered."""
        from schemas.prompt_generation import PromptGenerationRequest, AnsweredQuestion
        # Truncated in the middle of sections
        truncated_raw = (
            '{\n'
            '  "title": "Truncated App Spec",\n'
            '  "optimized_prompt": "### 1. ROLE\\nSenior Dev\\n\\n### 2. OBJECTIVE\\nBuild it.",\n'
            '  "sections": [\n'
            '    {"id": "role", "label": "ROLE", "type": "text", "content": "Senior Dev"},\n'
            '    {"id": "objective", "label": "OBJECTIVE", "type": "text", "content": "Build'
        )
        mock = _mock_client(truncated_raw)
        service = PromptGenerationService(client=mock)
        request = PromptGenerationRequest(
            original_query="Build an app",
            answers=[AnsweredQuestion(question_id=1, question="Scale?", selected_option="MVP")],
        )
        result = await service.generate_prompt(request)
        assert result.title == "Truncated App Spec"
        assert "Senior Dev" in result.optimized_prompt
