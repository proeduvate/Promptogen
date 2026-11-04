"""LangSmith observability & tracing manager for all LLM providers."""

import asyncio
import logging
import os
from typing import Any, Dict, List, Optional

from core.config import settings

logger = logging.getLogger("promptgen.clients.tracing")


def setup_langsmith_environment() -> bool:
    """Configures process environment variables required for LangChain/LangSmith tracing."""
    is_tracing_enabled = (
        str(settings.langchain_tracing_v2).strip().lower() in ("true", "1")
        and bool(settings.langchain_api_key)
        and not settings.langchain_api_key.startswith("your_")
    )

    if is_tracing_enabled:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
        os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project
        if hasattr(settings, "langchain_endpoint") and settings.langchain_endpoint:
            os.environ["LANGCHAIN_ENDPOINT"] = settings.langchain_endpoint
        logger.info(
            "LangSmith tracing configured and ACTIVE | project='%s'", settings.langchain_project
        )
        return True
    else:
        if "LANGCHAIN_TRACING_V2" in os.environ and os.environ["LANGCHAIN_TRACING_V2"] == "true" and not settings.langchain_api_key:
            os.environ["LANGCHAIN_TRACING_V2"] = "false"
        return False


def create_llm_run(
    name: str,
    inputs: Dict[str, Any],
    provider: str = "llm",
    model: Optional[str] = None,
    extra_metadata: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
) -> Optional[Any]:
    """Creates a LangSmith RunTree node for tracking direct client calls."""
    if not (
        str(settings.langchain_tracing_v2).strip().lower() in ("true", "1")
        and bool(settings.langchain_api_key)
        and not settings.langchain_api_key.startswith("your_")
    ):
        return None

    try:
        from langsmith import RunTree

        run_tags = ["promptogen", provider]
        if model:
            run_tags.append(model)
        if tags:
            run_tags.extend(tags)

        metadata = {
            "provider": provider,
            "model": model,
            **(extra_metadata or {}),
        }

        return RunTree(
            name=name,
            run_type="llm",
            inputs=inputs,
            project_name=settings.langchain_project,
            tags=run_tags,
            extra={"metadata": metadata},
        )
    except Exception as exc:
        logger.debug("LangSmith RunTree creation skipped: %s", exc)
        return None


async def post_llm_run(
    run: Optional[Any],
    outputs: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
) -> None:
    """Safely closes and posts a LangSmith RunTree without blocking the event loop."""
    if run is None:
        return
    try:
        run.end(outputs=outputs, error=error)
        await asyncio.to_thread(run.post)
        logger.debug("LangSmith run posted | name=%s", run.name)
    except Exception as exc:
        logger.warning("LangSmith trace post failed: %s", exc)
