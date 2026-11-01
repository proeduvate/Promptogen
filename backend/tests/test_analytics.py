"""Unit tests for the Analytics API."""

from unittest.mock import AsyncMock, patch

from fastapi import status
from fastapi.testclient import TestClient

from main import app


MOCK_ANALYTICS = {
    "range_days": 7,
    "overview": {
        "total_prompts": 32,
        "avg_strength_score": 78,
        "high_quality_prompts": 21,
        "time_saved_hours": 12.8,
    },
    "prompt_strength": {
        "score": 78,
        "trend_points": 10,
        "label": "Good",
        "over_time": [
            {
                "date": "2026-09-26",
                "average_score": 78,
                "top_score": 92,
                "lowest_score": 45,
                "prompt_count": 5,
            }
        ],
    },
    "strength_breakdown": {
        "clarity": 90,
        "specificity": 85,
        "context": 80,
        "structure": 85,
        "actionability": 90,
    },
    "recent_prompts": [
        {
            "id": "00000000-0000-0000-0000-000000000001",
            "original_query": "Marketing strategy for SaaS product",
            "prompt_title": "SaaS Marketing Prompt",
            "overall_score": 80,
            "clarity": 90,
            "specificity": 85,
            "context": 80,
            "structure": 85,
            "actionability": 88,
            "completed_at": "2026-09-26T11:30:00+00:00",
        }
    ],
}


class TestAnalyticsEndpoint:

    def test_analytics_returns_dashboard_metrics(self) -> None:
        with patch("api.analytics.database.get_prompt_analytics", new=AsyncMock(return_value=MOCK_ANALYTICS)) as mock_query:
            response = TestClient(app).get("/api/v1/analytics?days=7")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["overview"]["total_prompts"] == 32
        assert body["overview"]["avg_strength_score"] == 78
        assert body["overview"]["high_quality_prompts"] == 21
        assert body["overview"]["time_saved_hours"] == 12.8
        assert body["prompt_strength"]["score"] == 78
        assert body["strength_breakdown"]["clarity"] == 90
        assert body["strength_breakdown"]["specificity"] == 85
        assert body["strength_breakdown"]["context"] == 80
        assert body["strength_breakdown"]["structure"] == 85
        assert body["strength_breakdown"]["actionability"] == 90
        assert body["recent_prompts"][0]["original_query"] == "Marketing strategy for SaaS product"
        mock_query.assert_awaited_once_with(days=7)

    def test_analytics_rejects_invalid_days(self) -> None:
        response = TestClient(app).get("/api/v1/analytics?days=0")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY