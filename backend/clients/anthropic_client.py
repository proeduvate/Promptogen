"""Async Anthropic Claude client wrapper."""

import asyncio
import logging
from typing import Optional

import httpx

from clients.tracing import create_llm_run, post_llm_run
from core.config import settings
from core.exceptions import LLMError, LLMTimeoutError

logger = logging.getLogger("promptgen.clients.anthropic")

_MAX_RETRIES = 3
_RETRY_DELAYS = [1.0, 2.0, 4.0]


class AnthropicClient:
    """Async wrapper around Anthropic Claude Messages REST API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.api_key = api_key or settings.anthropic_api_key
        self.model = model or settings.anthropic_model
        self.timeout = timeout or settings.llm_timeout
        self.provider = "anthropic"

    async def chat_completion(
        self,
        system_prompt: str,
        user_message: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        response_format: Optional[dict] = None,
    ) -> str:
        """Call Anthropic Messages API with exponential backoff and LangSmith tracing."""
        if not self.api_key or self.api_key.startswith("your_") or self.api_key.startswith("sk-ant-placeholder"):
            raise LLMError(
                "Anthropic API key is not configured. Please supply ANTHROPIC_API_KEY in .env or provide an API key in the UI."
            )

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        temp = temperature if temperature is not None else settings.llm_temperature
        tokens = max_tokens or settings.llm_max_tokens

        payload = {
            "model": self.model,
            "max_tokens": tokens,
            "temperature": temp,
            "messages": [{"role": "user", "content": user_message}],
        }
        if system_prompt:
            payload["system"] = system_prompt

        url = "https://api.anthropic.com/v1/messages"
        run = create_llm_run(
            name=f"Anthropic Completion [{self.model}]",
            inputs={"system_prompt": system_prompt, "user_message": user_message},
            provider="anthropic",
            model=self.model,
        )

        last_exc: Optional[Exception] = None

        for attempt in range(_MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(url, headers=headers, json=payload)

                if resp.status_code == 200:
                    data = resp.json()
                    content_blocks = data.get("content", [])
                    text_parts = [b.get("text", "") for b in content_blocks if b.get("type") == "text"]
                    result_text = "".join(text_parts)
                    await post_llm_run(run, outputs={"response": result_text})
                    return result_text

                if resp.status_code == 429:
                    wait = _RETRY_DELAYS[attempt]
                    logger.warning("Anthropic 429 rate limit hit; waiting %.1fs (attempt %d/%d)", wait, attempt + 1, _MAX_RETRIES)
                    await asyncio.sleep(wait)
                    continue

                error_detail = resp.text
                try:
                    error_json = resp.json()
                    error_detail = error_json.get("error", {}).get("message", error_detail)
                except Exception:
                    pass
                err = LLMError(f"Anthropic API error (HTTP {resp.status_code}): {error_detail}")
                await post_llm_run(run, error=str(err))
                raise err

            except httpx.TimeoutException as exc:
                last_exc = exc
                wait = _RETRY_DELAYS[attempt]
                logger.warning("Anthropic request timed out; waiting %.1fs (attempt %d/%d)", wait, attempt + 1, _MAX_RETRIES)
                if attempt < _MAX_RETRIES - 1:
                    await asyncio.sleep(wait)
            except LLMError:
                raise
            except Exception as exc:
                last_exc = exc
                wait = _RETRY_DELAYS[attempt]
                logger.warning("Anthropic request failed: %s; waiting %.1fs", exc, wait)
                if attempt < _MAX_RETRIES - 1:
                    await asyncio.sleep(wait)

        timeout_err = LLMTimeoutError(
            f"Anthropic request failed after {_MAX_RETRIES} attempts: {last_exc}"
        )
        await post_llm_run(run, error=str(timeout_err))
        raise timeout_err from last_exc
