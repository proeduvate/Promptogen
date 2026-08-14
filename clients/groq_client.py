"""Async Groq client wrapper — same interface as openai_client.py."""

import asyncio
import logging
from typing import Optional

from groq import AsyncGroq, APITimeoutError, APIError

from core.config import settings
from core.exceptions import LLMError, LLMTimeoutError

logger = logging.getLogger("promptgen.clients.groq")

_MAX_RETRIES = 3
_RETRY_DELAYS = [1.0, 2.0, 4.0]  # seconds between attempts

# LangSmith tracing — only active when both env vars are set
_TRACING_ENABLED = (
    settings.langchain_tracing_v2.lower() == "true"
    and bool(settings.langchain_api_key)
)


def _make_run(name: str, inputs: dict):
    """Create a LangSmith RunTree. Returns None if tracing is disabled."""
    if not _TRACING_ENABLED:
        return None
    try:
        from langsmith import RunTree
        return RunTree(
            name=name,
            run_type="llm",
            inputs=inputs,
            project_name=settings.langchain_project,
        )
    except Exception as exc:
        logger.debug("LangSmith RunTree creation failed (tracing skipped): %s", exc)
        return None


async def _post_run(run, outputs=None, error=None):
    """End and post a RunTree to LangSmith. Silently swallows failures."""
    if run is None:
        return
    try:
        run.end(outputs=outputs, error=error)
        await run.apost()
    except Exception as exc:
        logger.debug("LangSmith trace post failed: %s", exc)


class GroqClient:
    """Thin async wrapper around the Groq chat-completions API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self._client = AsyncGroq(
            api_key=api_key or settings.groq_api_key,
            timeout=timeout or settings.llm_timeout,
        )
        self.model = model or settings.groq_model

    async def chat_completion(
        self,
        system_prompt: str,
        user_message: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Send a chat-completion request and return the assistant message text.

        Retries up to _MAX_RETRIES times on transient APIErrors with
        exponential backoff. Timeouts are never retried.
        """
        temp = temperature if temperature is not None else settings.llm_temperature
        tokens = max_tokens or settings.llm_max_tokens
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]

        run = _make_run(
            name=f"groq/{self.model}",
            inputs={
                "model": self.model,
                "messages": messages,
                "temperature": temp,
                "max_tokens": tokens,
            },
        )

        last_exc: Exception = RuntimeError("No attempts made")

        for attempt in range(_MAX_RETRIES):
            try:
                response = await self._client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temp,
                    max_tokens=tokens,
                )

                content = response.choices[0].message.content or ""
                usage = response.usage

                if usage:
                    logger.info(
                        "Groq token usage | model=%s prompt=%d completion=%d total=%d",
                        self.model,
                        usage.prompt_tokens,
                        usage.completion_tokens,
                        usage.total_tokens,
                    )

                await _post_run(run, outputs={
                    "content": content,
                    "usage": {
                        "prompt_tokens": usage.prompt_tokens if usage else 0,
                        "completion_tokens": usage.completion_tokens if usage else 0,
                        "total_tokens": usage.total_tokens if usage else 0,
                    },
                })

                return content

            except APITimeoutError as exc:
                await _post_run(run, error=f"Timeout: {exc}")
                raise LLMTimeoutError(
                    f"Groq request timed out after {settings.llm_timeout}s"
                ) from exc

            except APIError as exc:
                last_exc = exc
                if attempt < _MAX_RETRIES - 1:
                    delay = _RETRY_DELAYS[attempt]
                    logger.warning(
                        "Groq API error (attempt %d/%d), retrying in %.1fs: %s",
                        attempt + 1, _MAX_RETRIES, delay, exc,
                    )
                    await asyncio.sleep(delay)
                else:
                    await _post_run(run, error=f"APIError after {_MAX_RETRIES} attempts: {exc}")

            except asyncio.TimeoutError as exc:
                await _post_run(run, error="asyncio.TimeoutError")
                raise LLMTimeoutError("Request timed out") from exc

        raise LLMError(f"Groq API error after {_MAX_RETRIES} attempts: {last_exc}") from last_exc


def get_groq_client() -> GroqClient:
    """FastAPI dependency factory — returns a fresh Groq client per request."""
    return GroqClient()
