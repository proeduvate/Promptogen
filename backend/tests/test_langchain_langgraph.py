"""Tests for LangChain adapter, Model Switching, Structured Output, Self-Improvement, and Observability."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from pydantic import BaseModel, Field

from clients.factory import get_langchain_model
from clients.langchain_adapter import PromptogenChatModel
from graph.nodes import clarify_node, generate_node, assess_node, improve_node
from graph.workflow import _should_improve, gen_assess_workflow, clarify_workflow
from schemas.clarification import ClarificationResponse
from schemas.prompt_generation import PromptGenerationResponse


class DemoSchema(BaseModel):
    summary: str
    items: list[str] = Field(default_factory=list)
    confidence: float


@pytest.mark.asyncio
async def test_json_extraction_structured_output():
    """Feature 1: JSON Extraction via with_structured_output returning typed Pydantic models."""
    model = PromptogenChatModel(model_name="gemini-3.5-flash-lite")

    mock_llm_json = """```json
    {
        "summary": "Deterministic API blueprint",
        "items": ["Auth module", "Rate limiter"],
        "confidence": 0.98
    }
    ```"""

    mock_client = MagicMock()
    mock_client.chat_completion = AsyncMock(return_value=mock_llm_json)

    with patch.object(model, "_get_underlying_client", return_value=mock_client):
        runnable = model.with_structured_output(DemoSchema)
        result = await runnable.ainvoke("Generate architecture")

        assert isinstance(result, DemoSchema)
        assert result.summary == "Deterministic API blueprint"
        assert len(result.items) == 2
        assert result.confidence == 0.98


@pytest.mark.asyncio
async def test_model_switching_strict_preservation():
    """Feature 2: Model Switching — user selected model is strictly preserved and never auto-changed."""
    test_models = [
        ("gemini-3.5-flash-lite", "gemini"),
        ("gemini-3.5-flash", "gemini"),
        ("gemini-3.8-flash", "gemini"),
        ("qwen/qwen3.8-27b", "groq"),
        ("llama-3.3-70b-versatile", "groq"),
        ("gpt-4o-mini", "openai"),
    ]

    for selected_model, expected_provider_family in test_models:
        chat_model = get_langchain_model(model=selected_model)
        assert chat_model.model_name == selected_model, f"Model was changed from {selected_model}"

        client = chat_model._get_underlying_client()
        assert client.model == selected_model, f"Underlying client model mismatched for {selected_model}"


def test_self_improvement_conditional_router():
    """Feature 3: Self-Improvement — conditional router accurately decides when to improve."""
    # Case 1: Low score (< 85), first iteration (0), suggestions present -> should improve
    state_low_score = {
        "overall_score": 78,
        "iteration_count": 0,
        "suggestions": ["Add explicit error handling matrix"],
    }
    assert _should_improve(state_low_score) == "improve"

    # Case 2: Already improved once (iteration_count == 1) -> must route to end to prevent cycles
    state_already_improved = {
        "overall_score": 80,
        "iteration_count": 1,
        "suggestions": ["Refine terminology"],
    }
    assert _should_improve(state_already_improved) == "end"

    # Case 3: High score (>= 85) -> complete to end without unnecessary re-generation
    state_high_score = {
        "overall_score": 92,
        "iteration_count": 0,
        "suggestions": ["Nice work"],
    }
    assert _should_improve(state_high_score) == "end"

    # Case 4: No suggestions available -> end
    state_no_suggestions = {
        "overall_score": 75,
        "iteration_count": 0,
        "suggestions": [],
    }
    assert _should_improve(state_no_suggestions) == "end"


@pytest.mark.asyncio
async def test_improve_node_execution():
    """Feature 3: Self-Improvement — improve_node addresses suggestions and increments iteration."""
    state = {
        "original_query": "Build a secure auth system",
        "optimized_prompt": "Build an auth system with JWT.",
        "prompt_title": "Auth System",
        "overall_score": 75,
        "clarity": 70,
        "specificity": 75,
        "context": 80,
        "structure": 75,
        "actionability": 75,
        "suggestions": ["Specify refresh token rotation", "Specify bcrypt rounds"],
        "iteration_count": 0,
        "model": "gemini-3.5-flash-lite",
    }

    mock_improved_raw = """{
        "title": "Secure JWT Authentication Blueprint",
        "optimized_prompt": "### 1. ROLE & PERSONA\\nSecurity Engineer.\\n### 2. SPECIFICATIONS\\nRefresh token rotation with bcrypt 12 rounds.",
        "required_attachments": []
    }"""

    mock_client = MagicMock()
    mock_client.chat_completion = AsyncMock(return_value=mock_improved_raw)

    with patch("graph.nodes.get_langchain_model") as mock_get_model:
        mock_model_inst = MagicMock()
        mock_model_inst.chat_completion = AsyncMock(return_value=mock_improved_raw)
        mock_model_inst.model_name = "gemini-3.5-flash-lite"
        mock_get_model.return_value = mock_model_inst

        result = await improve_node(state)

        assert result["improved"] is True
        assert result["iteration_count"] == 1
        assert "Secure JWT Authentication Blueprint" in result["prompt_title"]
        assert "Refresh token rotation" in result["optimized_prompt"]
        assert len(result["sections"]) > 0


@pytest.mark.asyncio
async def test_observability_metadata_and_tokens():
    """Feature 4: Observability — tracks tokens, latency, and LangSmith metadata."""
    model = PromptogenChatModel(model_name="gemini-3.5-flash-lite")

    mock_client = MagicMock()
    mock_client.chat_completion = AsyncMock(return_value="Detailed architectural prompt output")

    with patch.object(model, "_get_underlying_client", return_value=mock_client):
        chat_result = await model._agenerate([MagicMock(type="human", content="Test prompt")])

        assert len(chat_result.generations) == 1
        gen = chat_result.generations[0]
        metadata = gen.message.response_metadata
        assert metadata["model_name"] == "gemini-3.5-flash-lite"
        assert "latency_sec" in metadata
        assert "token_usage" in metadata
        assert metadata["token_usage"]["total_tokens"] > 0
