"""PostgreSQL connection and persistence helpers."""

import json
import logging
import uuid
from typing import Any, Optional

from core.config import settings

logger = logging.getLogger("promptgen.core.database")


CREATE_PROMPT_ASSESSMENTS_SQL = """
CREATE TABLE IF NOT EXISTS prompt_assessments (
    id UUID PRIMARY KEY,
    prompt_text TEXT NOT NULL,
    overall_score INTEGER NOT NULL,
    clarity INTEGER NOT NULL,
    specificity INTEGER NOT NULL,
    context INTEGER NOT NULL,
    structure INTEGER NOT NULL,
    actionability INTEGER NOT NULL,
    suggestions JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""


CREATE_PROMPT_CREATIONS_SQL = """
CREATE TABLE IF NOT EXISTS prompt_creations (
    id UUID PRIMARY KEY,
    original_query TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    prompt_title TEXT,
    optimized_prompt TEXT,
    overall_score INTEGER,
    clarity INTEGER,
    specificity INTEGER,
    context INTEGER,
    structure INTEGER,
    actionability INTEGER,
    suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'awaiting_answers',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""


class Database:
    def __init__(self) -> None:
        self._pool: Any = None

    @property
    def enabled(self) -> bool:
        return bool(settings.database_url)

    async def connect(self) -> None:
        if not self.enabled:
            logger.info("DATABASE_URL is not configured; PostgreSQL persistence disabled")
            return

        if self._pool is not None:
            return

        try:
            import asyncpg
        except ImportError as exc:
            raise RuntimeError("asyncpg is required for PostgreSQL persistence. Install requirements.txt.") from exc

        self._pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=1, max_size=5)
        async with self._pool.acquire() as connection:
            await connection.execute(CREATE_PROMPT_ASSESSMENTS_SQL)
            await connection.execute(CREATE_PROMPT_CREATIONS_SQL)
        logger.info("PostgreSQL persistence connected")

    async def close(self) -> None:
        if self._pool is None:
            return
        await self._pool.close()
        self._pool = None
        logger.info("PostgreSQL persistence disconnected")

    async def save_prompt_assessment(self, prompt_text: str, assessment: dict) -> Optional[str]:
        if not self.enabled:
            return None

        if self._pool is None:
            await self.connect()

        assessment_id = uuid.uuid4()
        assert self._pool is not None
        async with self._pool.acquire() as connection:
            await connection.execute(
                """
                INSERT INTO prompt_assessments (
                    id, prompt_text, overall_score, clarity, specificity,
                    context, structure, actionability, suggestions
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
                """,
                assessment_id,
                prompt_text,
                assessment["overall_score"],
                assessment["clarity"],
                assessment["specificity"],
                assessment["context"],
                assessment["structure"],
                assessment["actionability"],
                json.dumps(assessment["suggestions"]),
            )
        return str(assessment_id)

    async def create_prompt_creation(self, thread_id: str, original_query: str, questions: list[dict]) -> Optional[str]:
        if not self.enabled:
            return None

        if self._pool is None:
            await self.connect()

        creation_id = uuid.UUID(thread_id)
        assert self._pool is not None
        async with self._pool.acquire() as connection:
            await connection.execute(
                """
                INSERT INTO prompt_creations (
                    id, original_query, questions, status
                ) VALUES ($1, $2, $3::jsonb, 'awaiting_answers')
                ON CONFLICT (id) DO UPDATE SET
                    original_query = EXCLUDED.original_query,
                    questions = EXCLUDED.questions,
                    answers = '[]'::jsonb,
                    prompt_title = NULL,
                    optimized_prompt = NULL,
                    overall_score = NULL,
                    clarity = NULL,
                    specificity = NULL,
                    context = NULL,
                    structure = NULL,
                    actionability = NULL,
                    suggestions = '[]'::jsonb,
                    status = 'awaiting_answers',
                    completed_at = NULL,
                    updated_at = NOW()
                """,
                creation_id,
                original_query,
                json.dumps(questions),
            )
        return thread_id

    async def complete_prompt_creation(self, thread_id: str, answers: list[dict], result: dict) -> Optional[str]:
        if not self.enabled:
            return None

        if self._pool is None:
            await self.connect()

        creation_id = uuid.UUID(thread_id)
        assert self._pool is not None
        async with self._pool.acquire() as connection:
            await connection.execute(
                """
                UPDATE prompt_creations SET
                    answers = $2::jsonb,
                    prompt_title = $3,
                    optimized_prompt = $4,
                    overall_score = $5,
                    clarity = $6,
                    specificity = $7,
                    context = $8,
                    structure = $9,
                    actionability = $10,
                    suggestions = $11::jsonb,
                    status = 'complete',
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1
                """,
                creation_id,
                json.dumps(answers),
                result.get("prompt_title", ""),
                result.get("optimized_prompt", ""),
                result.get("overall_score"),
                result.get("clarity"),
                result.get("specificity"),
                result.get("context"),
                result.get("structure"),
                result.get("actionability"),
                json.dumps(result.get("suggestions", [])),
            )
        return thread_id

    async def get_prompt_analytics(self, days: int = 7) -> dict:
        if not self.enabled:
            return _empty_analytics(days)

        if self._pool is None:
            await self.connect()

        assert self._pool is not None
        async with self._pool.acquire() as connection:
            overview = await connection.fetchrow(
                """
                                WITH analytics_prompts AS (
                                        SELECT
                                                original_query,
                                                prompt_title,
                                                optimized_prompt,
                                                overall_score,
                                                clarity,
                                                specificity,
                                                context,
                                                structure,
                                                actionability,
                                                completed_at AS created_at
                                        FROM prompt_creations
                                        WHERE status = 'complete'
                                            AND completed_at IS NOT NULL
                                        UNION ALL
                                        SELECT
                                                prompt_text AS original_query,
                                                NULL::text AS prompt_title,
                                                prompt_text AS optimized_prompt,
                                                overall_score,
                                                clarity,
                                                specificity,
                                                context,
                                                structure,
                                                actionability,
                                                created_at
                                        FROM prompt_assessments
                                )
                SELECT
                    COUNT(*)::int AS total_prompts,
                    COALESCE(ROUND(AVG(overall_score))::int, 0) AS avg_strength_score,
                    COUNT(*) FILTER (WHERE overall_score >= 80)::int AS high_quality_prompts,
                    COALESCE(ROUND(COUNT(*) * 0.4, 1), 0)::float AS time_saved_hours
                                FROM analytics_prompts
                                WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
                """,
                days,
            )
            previous = await connection.fetchrow(
                """
                                WITH analytics_prompts AS (
                                        SELECT overall_score, completed_at AS created_at
                                        FROM prompt_creations
                                        WHERE status = 'complete'
                                            AND completed_at IS NOT NULL
                                        UNION ALL
                                        SELECT overall_score, created_at
                                        FROM prompt_assessments
                                )
                SELECT COALESCE(ROUND(AVG(overall_score))::int, 0) AS avg_strength_score
                                FROM analytics_prompts
                                WHERE created_at >= NOW() - (($1::int * 2) * INTERVAL '1 day')
                                    AND created_at < NOW() - ($1::int * INTERVAL '1 day')
                """,
                days,
            )
            breakdown = await connection.fetchrow(
                """
                                WITH analytics_prompts AS (
                                        SELECT clarity, specificity, context, structure, actionability, completed_at AS created_at
                                        FROM prompt_creations
                                        WHERE status = 'complete'
                                            AND completed_at IS NOT NULL
                                        UNION ALL
                                        SELECT clarity, specificity, context, structure, actionability, created_at
                                        FROM prompt_assessments
                                )
                SELECT
                    COALESCE(ROUND(AVG(clarity))::int, 0) AS clarity,
                    COALESCE(ROUND(AVG(specificity))::int, 0) AS specificity,
                    COALESCE(ROUND(AVG(context))::int, 0) AS context,
                    COALESCE(ROUND(AVG(structure))::int, 0) AS structure,
                    COALESCE(ROUND(AVG(actionability))::int, 0) AS actionability
                                FROM analytics_prompts
                                WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
                """,
                days,
            )
            over_time = await connection.fetch(
                """
                                WITH analytics_prompts AS (
                                        SELECT overall_score, completed_at AS created_at
                                        FROM prompt_creations
                                        WHERE status = 'complete'
                                            AND completed_at IS NOT NULL
                                        UNION ALL
                                        SELECT overall_score, created_at
                                        FROM prompt_assessments
                                )
                SELECT
                                        created_at::date AS date,
                    COALESCE(ROUND(AVG(overall_score))::int, 0) AS average_score,
                    COALESCE(MAX(overall_score), 0)::int AS top_score,
                    COALESCE(MIN(overall_score), 0)::int AS lowest_score,
                    COUNT(*)::int AS prompt_count
                                FROM analytics_prompts
                                WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
                                GROUP BY created_at::date
                                ORDER BY created_at::date
                """,
                days,
            )
            recent_prompts = await connection.fetch(
                """
                                WITH analytics_prompts AS (
                                        SELECT
                                                id::text,
                                                original_query,
                                                prompt_title,
                                                overall_score,
                                                clarity,
                                                specificity,
                                                context,
                                                structure,
                                                actionability,
                                                completed_at AS created_at
                                        FROM prompt_creations
                                        WHERE status = 'complete'
                                            AND completed_at IS NOT NULL
                                        UNION ALL
                                        SELECT
                                                id::text,
                                                prompt_text AS original_query,
                                                NULL::text AS prompt_title,
                                                overall_score,
                                                clarity,
                                                specificity,
                                                context,
                                                structure,
                                                actionability,
                                                created_at
                                        FROM prompt_assessments
                                )
                SELECT
                                        id,
                    original_query,
                    prompt_title,
                    overall_score,
                    clarity,
                    specificity,
                    context,
                    structure,
                    actionability,
                                        created_at
                                FROM analytics_prompts
                                ORDER BY created_at DESC
                LIMIT 10
                """
            )

        overview_data = dict(overview or {})
        previous_score = int((previous or {}).get("avg_strength_score") or 0)
        current_score = int(overview_data.get("avg_strength_score") or 0)
        trend_points = current_score - previous_score

        return {
            "range_days": days,
            "overview": {
                "total_prompts": int(overview_data.get("total_prompts") or 0),
                "avg_strength_score": current_score,
                "high_quality_prompts": int(overview_data.get("high_quality_prompts") or 0),
                "time_saved_hours": float(overview_data.get("time_saved_hours") or 0),
            },
            "prompt_strength": {
                "score": current_score,
                "trend_points": trend_points,
                "label": _strength_label(current_score, int(overview_data.get("total_prompts") or 0)),
                "over_time": [
                    {
                        "date": row["date"].isoformat(),
                        "average_score": row["average_score"],
                        "top_score": row["top_score"],
                        "lowest_score": row["lowest_score"],
                        "prompt_count": row["prompt_count"],
                    }
                    for row in over_time
                ],
            },
            "strength_breakdown": dict(breakdown or {}),
            "recent_prompts": [
                {
                    "id": row["id"],
                    "original_query": row["original_query"],
                    "prompt_title": row["prompt_title"],
                    "overall_score": row["overall_score"],
                    "clarity": row["clarity"],
                    "specificity": row["specificity"],
                    "context": row["context"],
                    "structure": row["structure"],
                    "actionability": row["actionability"],
                    "completed_at": row["created_at"].isoformat() if row["created_at"] else None,
                }
                for row in recent_prompts
            ],
        }


def _strength_label(score: int, total_prompts: int) -> str:
    if total_prompts == 0:
        return "No data"
    if score >= 80:
        return "Strong"
    if score >= 60:
        return "Good"
    if score >= 40:
        return "Needs work"
    return "Weak"


def _empty_analytics(days: int) -> dict:
    return {
        "range_days": days,
        "overview": {
            "total_prompts": 0,
            "avg_strength_score": 0,
            "high_quality_prompts": 0,
            "time_saved_hours": 0.0,
        },
        "prompt_strength": {
            "score": 0,
            "trend_points": 0,
            "label": "No data",
            "over_time": [],
        },
        "strength_breakdown": {
            "clarity": 0,
            "specificity": 0,
            "context": 0,
            "structure": 0,
            "actionability": 0,
        },
        "recent_prompts": [],
    }


database = Database()