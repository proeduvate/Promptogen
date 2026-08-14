"""Unit tests for the Quality Assessment Engine (Developer 3 scope).

Test cases covered:
1. Valid prompt - happy path end-to-end
2. Empty prompt - Pydantic rejects it (422)
3. LLM returns invalid JSON - AssessmentError -> 422
4. LLM timeout - LLMTimeoutError -> 504
5. LLM API error - LLMError -> 502
6. Scores are within 1-100 range
7. Response schema matches PromptAssessmentResponse
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock

from fastapi import status
from fastapi.testclient import TestClient

from main import app
from api.quality_assessment import get_quality_assessment_service
from core.exceptions import LLMError, LLMTimeoutError
from schemas.quality_assessment import PromptAssessmentResponse
from services.quality_assessment.service import QualityAssessmentService


def _make_llm_json(overall: int = 85, clarity: int = 90, specificity: int = 80) -> str:
    return json.dumps({
        "overall_score": overall,
        "clarity": clarity,
        "specificity": specificity,
        "suggestions": ["Add more context", "Specify output format"],
    })


def _mock_client(return_value: str = "") -> MagicMock:
    client = MagicMock()
    client.chat_completion = AsyncMock(return_value=return_value)
    return client


def _test_client_with_mock(mock_client: MagicMock) -> TestClient:
    def _override() -> QualityAssessmentService:
        return QualityAssessmentService(client=mock_client)
    app.dependency_overrides[get_quality_assessment_service] = _override
    return TestClient(app)


def _restore_overrides() -> None:
    app.dependency_overrides.clear()


class TestQualityAssessmentEndpoint:

    def teardown_method(self) -> None:
        _restore_overrides()

    def test_valid_prompt_returns_scores(self) -> None:
        mock = _mock_client(_make_llm_json())
        client = _test_client_with_mock(mock)
        resp = client.post("/api/v1/assess-prompt", json={"prompt": "You are an expert data analyst."})
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        assert "overall_score" in body
        assert "clarity" in body
        assert "specificity" in body
        assert "suggestions" in body

    def test_empty_prompt_returns_422(self) -> None:
        client = TestClient(app)
        resp = client.post("/api/v1/assess-prompt", json={"prompt": ""})
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_invalid_llm_json_returns_422(self) -> None:
        mock = _mock_client("This is not JSON.")
        client = _test_client_with_mock(mock)
        resp = client.post("/api/v1/assess-prompt", json={"prompt": "Some prompt"})
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_llm_timeout_returns_504(self) -> None:
        mock = MagicMock()
        mock.chat_completion = AsyncMock(side_effect=LLMTimeoutError("Timed out"))
        client = _test_client_with_mock(mock)
        resp = client.post("/api/v1/assess-prompt", json={"prompt": "Some prompt"})
        assert resp.status_code == status.HTTP_504_GATEWAY_TIMEOUT

    def test_llm_error_returns_502(self) -> None:
        mock = MagicMock()
        mock.chat_completion = AsyncMock(side_effect=LLMError("API error"))
        client = _test_client_with_mock(mock)
        resp = client.post("/api/v1/assess-prompt", json={"prompt": "Some prompt"})
        assert resp.status_code == status.HTTP_502_BAD_GATEWAY

    def test_scores_are_in_valid_range(self) -> None:
        mock = _mock_client(_make_llm_json(overall=72, clarity=88, specificity=65))
        client = _test_client_with_mock(mock)
        resp = client.post("/api/v1/assess-prompt", json={"prompt": "You are an expert."})
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        for field in ("overall_score", "clarity", "specificity"):
            assert 1 <= body[field] <= 100

    def test_response_matches_schema(self) -> None:
        mock = _mock_client(_make_llm_json())
        client = _test_client_with_mock(mock)
        resp = client.post("/api/v1/assess-prompt", json={"prompt": "You are an expert."})
        assert resp.status_code == status.HTTP_200_OK
        parsed = PromptAssessmentResponse.model_validate(resp.json())
        assert parsed.overall_score == 85
        assert parsed.clarity == 90
        assert parsed.specificity == 80
        assert len(parsed.suggestions) == 2


class TestQualityAssessmentService:

    @pytest.mark.asyncio
    async def test_service_returns_response_on_valid_output(self) -> None:
        mock = _mock_client(_make_llm_json())
        service = QualityAssessmentService(client=mock)
        result = await service.assess("You are a data analyst.")
        assert isinstance(result, PromptAssessmentResponse)
        assert result.overall_score == 85

    @pytest.mark.asyncio
    async def test_service_propagates_llm_timeout(self) -> None:
        mock = MagicMock()
        mock.chat_completion = AsyncMock(side_effect=LLMTimeoutError("timeout"))
        service = QualityAssessmentService(client=mock)
        with pytest.raises(LLMTimeoutError):
            await service.assess("Some prompt text")
