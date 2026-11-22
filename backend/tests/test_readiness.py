"""Unit tests for Prompt Readiness analysis and contract adherence."""

import pytest
from schemas.readiness import (
    ReadinessAnalysisRequest,
    ReadinessAnalysisResponse,
    ReadinessAnswerInput,
    ContextAdditionInput,
)
from services.readiness_service import ReadinessService

MOCK_STORED_QUESTIONS = [
    {
        "id": 1,
        "question": "What is the primary target audience?",
        "level": "required",
        "explanation": "Target users must be known.",
        "options": ["B2B Enterprise", "SMB", "Consumers"],
    },
    {
        "id": 2,
        "question": "What tech stack or framework will you use?",
        "level": "recommended",
        "explanation": "Helps tailor the code output.",
        "options": ["FastAPI + React", "Next.js", "Django"],
    },
    {
        "id": 3,
        "question": "What is the deployment environment?",
        "level": "optional",
        "explanation": "Infrastructure limits.",
        "options": ["Vercel", "AWS ECS", "Self-hosted Docker"],
    },
]

MOCK_STORED = {
    "original_query": "Build a SaaS analytics dashboard",
    "questions": MOCK_STORED_QUESTIONS,
    "task_domain": "software_development",
    "is_sufficient": False,
}


def test_readiness_missing_required_blocks_generation():
    """When a required question is unanswered, score is capped and generation is blocked."""
    req = ReadinessAnalysisRequest(
        thread_id="test-thread-readiness-123",
        client_revision=1,
        answers=[
            ReadinessAnswerInput(
                question_id=2,
                question="What tech stack?",
                selected_option="FastAPI + React",
                custom_input="",
            )
        ],
        context_additions=[],
        additional_context="",
    )

    res = ReadinessService.analyze(req, MOCK_STORED)

    assert isinstance(res, ReadinessAnalysisResponse)
    assert res.thread_id == "test-thread-readiness-123"
    assert res.client_revision == 1
    assert res.readiness.status == "needs_more_details"
    assert res.readiness.percentage <= 50
    assert res.generation_policy.can_generate is False
    assert res.generation_policy.can_generate_anyway is False

    # Required gap must be present in missing_context
    missing_ids = [g.id for g in res.missing_context]
    assert "gap-1" in missing_ids

    # An error warning must be included
    error_warnings = [w for w in res.warnings if w.severity == "error"]
    assert len(error_warnings) >= 1


def test_readiness_partial_ready_allows_generate_anyway():
    """When required questions are answered, recommended gaps allow Generate Anyway."""
    req = ReadinessAnalysisRequest(
        thread_id="test-thread-readiness-123",
        client_revision=2,
        answers=[
            ReadinessAnswerInput(
                question_id=1,
                question="What is the primary target audience?",
                selected_option="B2B Enterprise",
                custom_input="",
            )
        ],
        context_additions=[],
        additional_context="",
    )

    res = ReadinessService.analyze(req, MOCK_STORED)

    assert isinstance(res, ReadinessAnalysisResponse)
    assert res.readiness.status == "partially_ready"
    assert res.generation_policy.can_generate is False
    assert res.generation_policy.can_generate_anyway is True

    # Collected context must include answered question
    collected_ids = [c.id for c in res.collected_context]
    assert "answer-1" in collected_ids


def test_readiness_fully_answered_ready_to_generate():
    """When required and recommended questions are answered, status is ready_to_generate."""
    req = ReadinessAnalysisRequest(
        thread_id="test-thread-readiness-123",
        client_revision=3,
        answers=[
            ReadinessAnswerInput(
                question_id=1,
                question="What is the primary target audience?",
                selected_option="B2B Enterprise",
                custom_input="",
            ),
            ReadinessAnswerInput(
                question_id=2,
                question="What tech stack or framework will you use?",
                selected_option="FastAPI + React",
                custom_input="",
            ),
            ReadinessAnswerInput(
                question_id=3,
                question="What is the deployment environment?",
                selected_option="Vercel",
                custom_input="",
            ),
        ],
        context_additions=[],
        additional_context="Strict compliance with SOC2",
    )

    res = ReadinessService.analyze(req, MOCK_STORED)

    assert isinstance(res, ReadinessAnalysisResponse)
    assert res.readiness.status == "ready_to_generate"
    assert res.readiness.percentage >= 85
    assert res.generation_policy.can_generate is True
    assert res.generation_policy.can_generate_anyway is True
    assert len(res.missing_context) == 0


def test_readiness_context_addition_resolves_gap():
    """Adding a context addition moves the gap to collected context."""
    req = ReadinessAnalysisRequest(
        thread_id="test-thread-readiness-123",
        answers=[],
        context_additions=[
            ContextAdditionInput(
                gap_id="gap-1",
                label="Target Audience",
                value="Enterprise IT Directors",
            )
        ],
        additional_context="",
    )

    res = ReadinessService.analyze(req, MOCK_STORED)

    assert isinstance(res, ReadinessAnalysisResponse)
    collected_ids = [c.id for c in res.collected_context]
    assert "addition-gap-1" in collected_ids
