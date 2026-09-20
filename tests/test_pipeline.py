"""Unit tests for the Pipeline API.

Test cases covered:
1. /pipeline/start - valid query returns thread_id and questions
2. /pipeline/continue - valid answers return optimized prompt and scores
3. /pipeline/continue - unknown thread_id returns 404
4. /pipeline/continue - mismatched question_ids returns 422
5. /pipeline/start - empty query returns 422
6. /pipeline/continue - empty answers list returns 422
7. /pipeline/continue - thread_id consumed after first use (second call = 404)
"""

import pytest
from unittest.mock import AsyncMock, patch

from fastapi import status
from fastapi.testclient import TestClient

from main import app


MOCK_QUESTIONS = [
    {"id": 1, "question": "What platform?", "options": ["iOS", "Android", "Both"]},
    {"id": 2, "question": "Who is the target user?", "options": ["Beginners", "Athletes", "Everyone"]},
]

MOCK_GEN_ASSESS_RESULT = {
    "prompt_title": "Fitness App Prompt",
    "optimized_prompt": "You are an expert mobile app developer. Your task is to build a fitness tracking app.",
    "overall_score": 88,
    "clarity": 91,
    "specificity": 85,
    "suggestions": ["Add constraints section", "Specify output format"],
}

VALID_ANSWERS = [
    {"question_id": 1, "question": "What platform?", "selected_option": "Both", "custom_input": ""},
    {"question_id": 2, "question": "Who is the target user?", "selected_option": "Athletes", "custom_input": ""},
]


@pytest.fixture
def client():
    return TestClient(app)


def _start_session(client) -> str:
    """Helper: run /pipeline/start with mocked workflow and return thread_id."""
    with patch("api.pipeline.clarify_workflow") as mock_workflow:
        mock_workflow.ainvoke = AsyncMock(return_value={"questions": MOCK_QUESTIONS})
        resp = client.post("/api/v1/pipeline/start", json={"query": "Build a fitness app"})
    assert resp.status_code == status.HTTP_200_OK
    return resp.json()["thread_id"]


class TestPipelineStart:

    def test_valid_query_returns_thread_id_and_questions(self, client):
        with patch("api.pipeline.clarify_workflow") as mock_workflow:
            mock_workflow.ainvoke = AsyncMock(return_value={"questions": MOCK_QUESTIONS})
            resp = client.post("/api/v1/pipeline/start", json={"query": "Build a fitness app"})
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        assert "thread_id" in body
        assert body["thread_id"]
        assert body["status"] == "awaiting_answers"
        assert len(body["questions"]) == 2

    def test_empty_query_returns_422(self, client):
        resp = client.post("/api/v1/pipeline/start", json={"query": ""})
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestPipelineContinue:

    def test_valid_answers_return_optimized_prompt_and_scores(self, client):
        thread_id = _start_session(client)
        with patch("api.pipeline.gen_assess_workflow") as mock_workflow:
            mock_workflow.ainvoke = AsyncMock(return_value=MOCK_GEN_ASSESS_RESULT)
            resp = client.post("/api/v1/pipeline/continue", json={
                "thread_id": thread_id,
                "answers": VALID_ANSWERS,
            })
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        assert body["thread_id"] == thread_id
        assert body["status"] == "complete"
        assert body["optimized_prompt"]
        assert body["prompt_title"] == "Fitness App Prompt"
        assert body["overall_score"] == 88
        assert body["clarity"] == 91
        assert body["specificity"] == 85
        assert len(body["suggestions"]) == 2

    def test_unknown_thread_id_returns_404(self, client):
        resp = client.post("/api/v1/pipeline/continue", json={
            "thread_id": "00000000-0000-0000-0000-000000000000",
            "answers": VALID_ANSWERS,
        })
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_mismatched_question_ids_returns_422(self, client):
        thread_id = _start_session(client)
        wrong_answers = [
            {"question_id": 99, "question": "Wrong?", "selected_option": "Yes", "custom_input": ""},
        ]
        with patch("api.pipeline.gen_assess_workflow") as mock_workflow:
            mock_workflow.ainvoke = AsyncMock(return_value=MOCK_GEN_ASSESS_RESULT)
            resp = client.post("/api/v1/pipeline/continue", json={
                "thread_id": thread_id,
                "answers": wrong_answers,
            })
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        detail = resp.json()["detail"].lower()
        assert "question_id" in detail or "validation" in detail

    def test_empty_answers_returns_422(self, client):
        resp = client.post("/api/v1/pipeline/continue", json={
            "thread_id": "some-id",
            "answers": [],
        })
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_thread_id_consumed_after_continue(self, client):
        thread_id = _start_session(client)
        with patch("api.pipeline.gen_assess_workflow") as mock_workflow:
            mock_workflow.ainvoke = AsyncMock(return_value=MOCK_GEN_ASSESS_RESULT)
            first = client.post("/api/v1/pipeline/continue", json={
                "thread_id": thread_id, "answers": VALID_ANSWERS,
            })
            second = client.post("/api/v1/pipeline/continue", json={
                "thread_id": thread_id, "answers": VALID_ANSWERS,
            })
        assert first.status_code == status.HTTP_200_OK
        assert second.status_code == status.HTTP_404_NOT_FOUND
