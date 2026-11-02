"""PostgreSQL connection and persistence helpers."""

import json
import logging
import urllib.parse
import uuid
from typing import Any, Dict, List, Optional

from core.config import settings

logger = logging.getLogger("promptgen.core.database")


def normalize_database_url(url: str, default_driver: str = "") -> str:
    """Normalize a database connection URL, properly handling passwords with '@' or '%40'.

    If a password contains an unencoded '@', it is encoded to '%40' so URL parsers
    do not misidentify the host separator. Existing '%40' values are preserved.
    """
    if not url or not isinstance(url, str):
        return ""

    url = url.strip()
    if "://" not in url:
        return url

    scheme, rest = url.split("://", 1)

    if default_driver and "+" not in scheme:
        scheme = f"{scheme}+{default_driver}"

    # If no credentials present, return directly
    if "@" not in rest:
        return f"{scheme}://{rest}"

    # Find the host separator '@', which is the LAST '@' before the path '/' or query '?'
    path_start = len(rest)
    for sep in ("/", "?", "#"):
        pos = rest.find(sep)
        if pos != -1 and pos < path_start:
            path_start = pos

    auth_and_host = rest[:path_start]
    path_and_query = rest[path_start:]

    if "@" not in auth_and_host:
        return f"{scheme}://{rest}"

    # Split auth credentials from host at the last '@'
    auth, host_part = auth_and_host.rsplit("@", 1)

    if ":" in auth:
        user, password = auth.split(":", 1)
        # Unquote first to prevent double encoding %40 -> %2540
        decoded_password = urllib.parse.unquote(password)
        decoded_user = urllib.parse.unquote(user)
        # Encode password converting '@' to '%40'
        encoded_password = urllib.parse.quote(decoded_password, safe="")
        encoded_user = urllib.parse.quote(decoded_user, safe="")
        auth = f"{encoded_user}:{encoded_password}"
    else:
        decoded_user = urllib.parse.unquote(auth)
        auth = urllib.parse.quote(decoded_user, safe="")

    return f"{scheme}://{auth}@{host_part}{path_and_query}"


class Database:
    def __init__(self) -> None:
        self._pool: Any = None

    @property
    def enabled(self) -> bool:
        return bool(settings.database_url)

    @property
    def is_connected(self) -> bool:
        return self._pool is not None

    def _get_dsn(self) -> str:
        url = normalize_database_url(settings.database_url)
        if "+psycopg" in url:
            url = url.replace("+psycopg", "", 1)
        elif "+asyncpg" in url:
            url = url.replace("+asyncpg", "", 1)
        return url

    async def connect(self) -> None:
        if not self.enabled:
            import os
            import sys
            is_test_env = "pytest" in sys.modules or os.getenv("TESTING") == "true"
            if is_test_env:
                logger.info("DATABASE_URL is not configured; running in test mode without PostgreSQL")
                return
            raise RuntimeError(
                "DATABASE_URL is not configured. Database connection is required; in-memory fallback is disabled."
            )

        if self._pool is not None:
            return

        try:
            import asyncpg
        except ImportError as exc:
            raise RuntimeError("asyncpg is required for PostgreSQL persistence. Install requirements.txt.") from exc

        dsn = self._get_dsn()
        pool_kwargs = {"dsn": dsn, "min_size": 1, "max_size": 5}
        if ":6543" in dsn or "pooler" in dsn or "supabase.co" in dsn or "supabase.com" in dsn:
            pool_kwargs["statement_cache_size"] = 0
            if "ssl=" not in dsn and "sslmode=" not in dsn:
                pool_kwargs["ssl"] = "require"

        try:
            self._pool = await asyncpg.create_pool(**pool_kwargs)
        except Exception as exc:
            if "Cannot assign requested address" in str(exc) or "[Errno 99]" in str(exc):
                err_msg = (
                    "Database connection failed with [Errno 99] Cannot assign requested address. "
                    "This occurs on Vercel/serverless environments because the direct Supabase host ('db.<project-ref>.supabase.co') "
                    "resolves only to IPv6, which Vercel serverless functions do not support. "
                    "To fix this, update DATABASE_URL in Vercel to Supabase's IPv4 Connection Pooler: "
                    "postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
                )
                logger.critical(err_msg)
                raise RuntimeError(err_msg) from exc
            logger.critical("Fatal: Database connection failed: %s", exc)
            raise RuntimeError(f"Database connection failed: {exc}") from exc

        logger.info("PostgreSQL persistence connected to %s", dsn.split("@")[-1] if "@" in dsn else "local")

    async def close(self) -> None:
        if self._pool is None:
            return
        await self._pool.close()
        self._pool = None
        logger.info("PostgreSQL persistence disconnected")

    async def _ensure_connected(self) -> None:
        import asyncio
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if self._pool is not None and loop is not None and getattr(self._pool, "_loop", None) != loop:
            try:
                await self._pool.close()
            except Exception:
                pass
            self._pool = None

        if self._pool is None:
            await self.connect()

    # ── Prompt Assessments ─────────────────────────────────────────────────────

    async def save_prompt_assessment(
        self, prompt_text: str, assessment: dict, user_id: Optional[str] = None
    ) -> Optional[str]:
        if not self.enabled:
            return None

        await self._ensure_connected()
        assessment_id = uuid.uuid4()
        user_uuid = uuid.UUID(user_id) if user_id else None
        assert self._pool is not None
        async with self._pool.acquire() as connection:
            await connection.execute(
                """
                INSERT INTO prompt_assessments (
                    id, user_id, prompt_text, overall_score, clarity, specificity,
                    context, structure, actionability, suggestions
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
                """,
                assessment_id,
                user_uuid,
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

    # ── Prompt Creations (Pipeline) ────────────────────────────────────────────

    async def create_prompt_creation(
        self, thread_id: str, original_query: str, questions: list[dict], user_id: Optional[str] = None
    ) -> Optional[str]:
        if not self.enabled:
            return None

        await self._ensure_connected()
        creation_id = uuid.UUID(thread_id)
        user_uuid = uuid.UUID(user_id) if user_id else None
        assert self._pool is not None
        async with self._pool.acquire() as connection:
            await connection.execute(
                """
                INSERT INTO prompt_creations (
                    id, user_id, original_query, questions, status
                ) VALUES ($1, $2, $3, $4::jsonb, 'awaiting_answers')
                ON CONFLICT (id) DO UPDATE SET
                    user_id = COALESCE(EXCLUDED.user_id, prompt_creations.user_id),
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
                user_uuid,
                original_query,
                json.dumps(questions),
            )
        return thread_id

    async def complete_prompt_creation(self, thread_id: str, answers: list[dict], result: dict) -> Optional[str]:
        if not self.enabled:
            return None

        await self._ensure_connected()
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

    async def get_prompt_creation(self, thread_id: str) -> Optional[dict]:
        if not self.enabled:
            return None

        try:
            await self._ensure_connected()
            creation_id = uuid.UUID(thread_id)
            assert self._pool is not None
            async with self._pool.acquire() as connection:
                row = await connection.fetchrow(
                    """
                    SELECT id, original_query, questions, answers, prompt_title,
                           optimized_prompt, overall_score, clarity, specificity,
                           context, structure, actionability, suggestions, status
                    FROM prompt_creations
                    WHERE id = $1
                    """,
                    creation_id,
                )
                if not row:
                    return None
                q_raw = row["questions"]
                a_raw = row["answers"]
                s_raw = row["suggestions"]
                return {
                    "id": str(row["id"]),
                    "original_query": row["original_query"],
                    "questions": json.loads(q_raw) if isinstance(q_raw, str) else (q_raw or []),
                    "answers": json.loads(a_raw) if isinstance(a_raw, str) else (a_raw or []),
                    "prompt_title": row["prompt_title"],
                    "optimized_prompt": row["optimized_prompt"],
                    "overall_score": row["overall_score"],
                    "clarity": row["clarity"],
                    "specificity": row["specificity"],
                    "context": row["context"],
                    "structure": row["structure"],
                    "actionability": row["actionability"],
                    "suggestions": json.loads(s_raw) if isinstance(s_raw, str) else (s_raw or []),
                    "status": row["status"],
                }
        except Exception as exc:
            logger.warning("Database get_prompt_creation error: %s", exc)
            return None

    # ── Folders & Library Management ───────────────────────────────────────────

    async def get_library_folders(self) -> List[Dict[str, Any]]:
        if not self.enabled:
            return []

        await self._ensure_connected()
        assert self._pool is not None
        async with self._pool.acquire() as connection:
            rows = await connection.fetch(
                """
                SELECT
                    f.id,
                    f.label,
                    f.icon,
                    f.tone,
                    COALESCE(COUNT(p.id) FILTER (WHERE p.archived = FALSE), 0)::int AS count
                FROM library_folders f
                LEFT JOIN saved_prompts p ON p.folder_id = f.id
                GROUP BY f.id, f.label, f.icon, f.tone, f.created_at
                ORDER BY f.created_at ASC
                """
            )
            total_active = await connection.fetchval(
                "SELECT COUNT(*)::int FROM saved_prompts WHERE archived = FALSE"
            )

        folders = [dict(r) for r in rows]
        # Ensure 'all' reflects the total active count
        for f in folders:
            if f["id"] == "all":
                f["count"] = total_active or 0
        return folders

    async def list_saved_prompts(
        self,
        tab: str = "all",
        folder: str = "all",
        model: str = "all",
        tag: str = "all",
        created_by: str = "all",
        search: str = "",
        page: int = 1,
        page_size: int = 10,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.enabled:
            return {"total": 0, "page": page, "page_size": page_size, "prompts": []}

        await self._ensure_connected()
        assert self._pool is not None

        conditions = []
        params = []
        idx = 1

        # User filter if provided
        if user_id:
            try:
                u_uuid = uuid.UUID(str(user_id))
                conditions.append(f"(user_id = ${idx} OR user_id IS NULL)")
                params.append(u_uuid)
                idx += 1
            except (ValueError, TypeError):
                pass

        # Tab conditions
        if tab == "favorites":
            conditions.append(f"favorite = TRUE AND archived = FALSE")
        elif tab == "trash":
            conditions.append(f"archived = TRUE")
        else:
            conditions.append(f"archived = FALSE")

        # Folder condition
        if folder != "all":
            conditions.append(f"folder_id = ${idx}")
            params.append(folder)
            idx += 1

        # Model condition
        if model != "all":
            conditions.append(f"model = ${idx}")
            params.append(model)
            idx += 1

        # Creator condition
        if created_by != "all":
            conditions.append(f"created_by = ${idx}")
            params.append(created_by)
            idx += 1

        # Tag condition
        if tag != "all":
            conditions.append(f"tags ? ${idx}")
            params.append(tag)
            idx += 1

        # Search condition
        if search.strip():
            needle = f"%{search.strip().lower()}%"
            conditions.append(f"(LOWER(title) LIKE ${idx} OR tags::text LIKE ${idx})")
            params.append(needle)
            idx += 1

        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

        offset = (page - 1) * page_size
        params.extend([page_size, offset])
        limit_offset = f" LIMIT ${idx} OFFSET ${idx + 1}"

        count_query = f"SELECT COUNT(*)::int FROM saved_prompts{where_clause}"
        select_query = f"""
            SELECT
                id,
                user_id,
                title,
                created_by AS "createdBy",
                TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
                TO_CHAR(created_at, 'Mon DD, YYYY') AS created,
                model,
                COALESCE(folder_id, 'marketing') AS folder,
                tags,
                score,
                favorite,
                archived,
                current_version AS "currentVersion",
                versions,
                sections
            FROM saved_prompts
            {where_clause}
            ORDER BY created_at DESC
            {limit_offset}
        """

        async with self._pool.acquire() as connection:
            total = await connection.fetchval(count_query, *params[:-2])
            records = await connection.fetch(select_query, *params)

        prompts = []
        for r in records:
            item = dict(r)
            # Parse jsonb fields
            item["tags"] = json.loads(item["tags"]) if isinstance(item["tags"], str) else item["tags"] or []
            item["versions"] = json.loads(item["versions"]) if isinstance(item["versions"], str) else item["versions"] or []
            item["sections"] = json.loads(item["sections"]) if isinstance(item["sections"], str) else item["sections"] or []
            item["moreTags"] = max(0, len(item["tags"]) - 3)
            prompts.append(item)

        return {
            "total": total or 0,
            "page": page,
            "page_size": page_size,
            "prompts": prompts,
        }

    async def get_saved_prompt(self, prompt_id: str) -> Optional[Dict[str, Any]]:
        if not self.enabled:
            return None

        await self._ensure_connected()
        assert self._pool is not None
        async with self._pool.acquire() as connection:
            record = await connection.fetchrow(
                """
                SELECT
                    id,
                    user_id,
                    title,
                    created_by AS "createdBy",
                    TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
                    TO_CHAR(created_at, 'Mon DD, YYYY') AS created,
                    model,
                    COALESCE(folder_id, 'marketing') AS folder,
                    tags,
                    score,
                    favorite,
                    archived,
                    current_version AS "currentVersion",
                    versions,
                    sections
                FROM saved_prompts
                WHERE id = $1
                """,
                prompt_id,
            )

        if not record:
            return None

        item = dict(record)
        item["tags"] = json.loads(item["tags"]) if isinstance(item["tags"], str) else item["tags"] or []
        item["versions"] = json.loads(item["versions"]) if isinstance(item["versions"], str) else item["versions"] or []
        item["sections"] = json.loads(item["sections"]) if isinstance(item["sections"], str) else item["sections"] or []
        item["moreTags"] = max(0, len(item["tags"]) - 3)
        return item

    async def save_saved_prompt(self, data: Dict[str, Any]) -> Dict[str, Any]:
        prompt_id = data.get("id") or str(uuid.uuid4())[:8]
        title = data.get("title", "Untitled Prompt")
        model = data.get("model", "GPT-4o")
        folder_id = data.get("folder", "marketing")
        tags = data.get("tags") or ["AI", "Custom"]
        score = data.get("score", 85)
        sections = data.get("sections") or []
        versions = data.get("versions") or []

        user_id = data.get("user_id") or data.get("userId")
        user_uuid = None
        if user_id:
            try:
                user_uuid = uuid.UUID(str(user_id))
            except (ValueError, TypeError):
                user_uuid = None

        if not self.enabled:
            return {
                "id": prompt_id,
                "user_id": str(user_uuid) if user_uuid else None,
                "title": title,
                "createdBy": "you",
                "model": model,
                "folder": folder_id,
                "tags": tags,
                "score": score,
                "favorite": False,
                "sections": sections,
                "versions": versions,
            }

        await self._ensure_connected()
        assert self._pool is not None
        async with self._pool.acquire() as connection:
            await connection.execute(
                """
                INSERT INTO saved_prompts (
                    id, user_id, title, created_by, model, folder_id, tags, score, favorite, archived, sections, versions, updated_at
                ) VALUES (
                    $1, $2, $3, 'you', $4, $5, $6::jsonb, $7, FALSE, FALSE, $8::jsonb, $9::jsonb, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                    user_id = COALESCE(EXCLUDED.user_id, saved_prompts.user_id),
                    title = EXCLUDED.title,
                    model = EXCLUDED.model,
                    folder_id = EXCLUDED.folder_id,
                    tags = EXCLUDED.tags,
                    score = EXCLUDED.score,
                    sections = EXCLUDED.sections,
                    versions = EXCLUDED.versions,
                    updated_at = NOW()
                """,
                prompt_id,
                user_uuid,
                title,
                model,
                folder_id,
                json.dumps(tags),
                score,
                json.dumps(sections),
                json.dumps(versions),
            )

        return await self.get_saved_prompt(prompt_id) or {
            "id": prompt_id,
            "title": title,
            "createdBy": "you",
            "model": model,
            "folder": folder_id,
            "tags": tags,
            "score": score,
            "favorite": False,
            "sections": sections,
        }

    async def toggle_saved_prompt_favorite(self, prompt_id: str) -> Optional[bool]:
        if not self.enabled:
            return None

        await self._ensure_connected()
        assert self._pool is not None
        async with self._pool.acquire() as connection:
            fav = await connection.fetchval(
                """
                UPDATE saved_prompts
                SET favorite = NOT favorite, updated_at = NOW()
                WHERE id = $1
                RETURNING favorite
                """,
                prompt_id,
            )
        return fav

    async def delete_saved_prompt(self, prompt_id: str) -> bool:
        if not self.enabled:
            return False

        await self._ensure_connected()
        assert self._pool is not None
        async with self._pool.acquire() as connection:
            result = await connection.execute(
                "DELETE FROM saved_prompts WHERE id = $1",
                prompt_id,
            )
        return "DELETE 1" in result

    # ── Prompt Analytics ───────────────────────────────────────────────────────

    async def get_prompt_analytics(self, days: int = 7) -> dict:
        if not self.enabled:
            return _empty_analytics(days)

        await self._ensure_connected()
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
                    UNION ALL
                    SELECT
                        title AS original_query,
                        title AS prompt_title,
                        COALESCE(prompt_text, title) AS optimized_prompt,
                        score AS overall_score,
                        90 AS clarity,
                        85 AS specificity,
                        80 AS context,
                        85 AS structure,
                        90 AS actionability,
                        created_at
                    FROM saved_prompts
                    WHERE archived = FALSE
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
                    WHERE status = 'complete' AND completed_at IS NOT NULL
                    UNION ALL
                    SELECT overall_score, created_at FROM prompt_assessments
                    UNION ALL
                    SELECT score AS overall_score, created_at FROM saved_prompts WHERE archived = FALSE
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
                    WHERE status = 'complete' AND completed_at IS NOT NULL
                    UNION ALL
                    SELECT clarity, specificity, context, structure, actionability, created_at
                    FROM prompt_assessments
                    UNION ALL
                    SELECT 90 AS clarity, 85 AS specificity, 80 AS context, 85 AS structure, 90 AS actionability, created_at
                    FROM saved_prompts WHERE archived = FALSE
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
                    WHERE status = 'complete' AND completed_at IS NOT NULL
                    UNION ALL
                    SELECT overall_score, created_at FROM prompt_assessments
                    UNION ALL
                    SELECT score AS overall_score, created_at FROM saved_prompts WHERE archived = FALSE
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
                    WHERE status = 'complete' AND completed_at IS NOT NULL
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
                    UNION ALL
                    SELECT
                        id::text,
                        title AS original_query,
                        title AS prompt_title,
                        score AS overall_score,
                        90 AS clarity,
                        85 AS specificity,
                        80 AS context,
                        85 AS structure,
                        90 AS actionability,
                        created_at
                    FROM saved_prompts
                    WHERE archived = FALSE
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

    # ── User Persistence ───────────────────────────────────────────────────────

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        if not self.enabled:
            return None
        await self._ensure_connected()
        assert self._pool is not None
        async with self._pool.acquire() as connection:
            row = await connection.fetchrow(
                """
                SELECT id, email, name, password_hash, auth_provider, google_id, avatar_url, is_active, created_at
                FROM users
                WHERE LOWER(email) = LOWER($1)
                """,
                email.strip(),
            )
            if not row:
                return None
            res = dict(row)
            res["id"] = str(res["id"])
            return res

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        if not self.enabled:
            return None
        await self._ensure_connected()
        assert self._pool is not None
        try:
            u_uuid = uuid.UUID(user_id)
        except (ValueError, TypeError):
            return None
        async with self._pool.acquire() as connection:
            row = await connection.fetchrow(
                """
                SELECT id, email, name, password_hash, auth_provider, google_id, avatar_url, is_active, created_at
                FROM users
                WHERE id = $1
                """,
                u_uuid,
            )
            if not row:
                return None
            res = dict(row)
            res["id"] = str(res["id"])
            return res

    async def upsert_user(self, user: dict) -> Optional[dict]:
        if not self.enabled:
            return None
        await self._ensure_connected()
        assert self._pool is not None
        u_id = uuid.UUID(user["id"]) if isinstance(user["id"], str) else user["id"]
        async with self._pool.acquire() as connection:
            await connection.execute(
                """
                INSERT INTO users (id, email, name, password_hash, auth_provider, google_id, avatar_url, is_active, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
                    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
                    google_id = COALESCE(EXCLUDED.google_id, users.google_id),
                    updated_at = NOW()
                """,
                u_id,
                user["email"].strip().lower(),
                user["name"],
                user.get("password_hash"),
                user.get("auth_provider", "local"),
                user.get("google_id"),
                user.get("avatar_url"),
                user.get("is_active", True),
            )
            return await self.get_user_by_id(str(u_id))

    # ── Guest Rate Limit Persistence ──────────────────────────────────────────

    async def get_guest_rate_limit(self, ip_address: str, usage_date: Optional[str] = None) -> int:
        if not self.enabled:
            return 0
        await self._ensure_connected()
        assert self._pool is not None
        clean_ip = ip_address.strip() if ip_address else "127.0.0.1"
        async with self._pool.acquire() as connection:
            if usage_date:
                count = await connection.fetchval(
                    "SELECT count FROM guest_rate_limits WHERE ip_address = $1 AND usage_date = $2::date",
                    clean_ip,
                    usage_date,
                )
            else:
                count = await connection.fetchval(
                    "SELECT count FROM guest_rate_limits WHERE ip_address = $1 AND usage_date = CURRENT_DATE",
                    clean_ip,
                )
            return count or 0

    async def increment_guest_rate_limit(self, ip_address: str) -> int:
        if not self.enabled:
            return 0
        await self._ensure_connected()
        assert self._pool is not None
        clean_ip = ip_address.strip() if ip_address else "127.0.0.1"
        async with self._pool.acquire() as connection:
            new_count = await connection.fetchval(
                """
                INSERT INTO guest_rate_limits (ip_address, usage_date, count, updated_at)
                VALUES ($1, CURRENT_DATE, 1, NOW())
                ON CONFLICT (ip_address, usage_date) DO UPDATE SET
                    count = guest_rate_limits.count + 1,
                    updated_at = NOW()
                RETURNING count
                """,
                clean_ip,
            )
            return new_count or 1

    async def reset_guest_rate_limit(self, ip_address: str) -> bool:
        if not self.enabled:
            return True
        await self._ensure_connected()
        assert self._pool is not None
        clean_ip = ip_address.strip() if ip_address else "127.0.0.1"
        async with self._pool.acquire() as connection:
            await connection.execute(
                "DELETE FROM guest_rate_limits WHERE ip_address = $1",
                clean_ip,
            )
            return True


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