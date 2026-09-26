"""Analytics API backed by saved prompt generation data."""

import logging

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from core.database import database

logger = logging.getLogger("promptgen.api.analytics")

router = APIRouter(prefix="/api/v1", tags=["Analytics"])


class AnalyticsOverview(BaseModel):
    total_prompts: int
    avg_strength_score: int
    high_quality_prompts: int
    time_saved_hours: float


class PromptStrengthPoint(BaseModel):
    date: str
    average_score: int
    top_score: int
    lowest_score: int
    prompt_count: int


class PromptStrength(BaseModel):
    score: int
    trend_points: int
    label: str
    over_time: list[PromptStrengthPoint]


class StrengthBreakdown(BaseModel):
    clarity: int
    specificity: int
    context: int
    structure: int
    actionability: int


class RecentPromptPerformance(BaseModel):
    id: str
    original_query: str
    prompt_title: str | None = None
    overall_score: int | None = None
    clarity: int | None = None
    specificity: int | None = None
    context: int | None = None
    structure: int | None = None
    actionability: int | None = None
    completed_at: str | None = None


class AnalyticsResponse(BaseModel):
    range_days: int = Field(..., ge=1, le=365)
    overview: AnalyticsOverview
    prompt_strength: PromptStrength
    strength_breakdown: StrengthBreakdown
    recent_prompts: list[RecentPromptPerformance]


@router.get(
    "/analytics",
    response_model=AnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get prompt analytics dashboard data",
    description="Returns dashboard metrics computed from saved prompt creation records.",
)
async def get_analytics(days: int = Query(default=7, ge=1, le=365)) -> AnalyticsResponse:
    try:
        data = await database.get_prompt_analytics(days=days)
    except Exception as exc:
        logger.error("Analytics query failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics data is unavailable. Check the PostgreSQL connection and prompt_creations table.",
        ) from exc

    return AnalyticsResponse.model_validate(data)