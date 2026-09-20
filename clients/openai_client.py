"""Async OpenAI client wrapper — shared across all engine developers."""

import asyncio
from typing import Optional

from openai import AsyncOpenAI, APITimeoutError, APIError

from core.config import settings
from core.exceptions import LLMError, LLMTimeoutError


class OpenAIClient:
    """Thin async wrapper around the OpenAI chat-completions API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self._client = AsyncOpenAI(
            api_key=api_key or settings.openai_api_key,
            timeout=timeout or settings.llm_timeout,
        )
        self.model = model or settings.openai_model

    async def chat_completion(
        self,
        system_prompt: str,
        user_message: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Send a chat-completion request and return the assistant message text.

        Raises:
            LLMTimeoutError: on request timeout.
            LLMError: on any other OpenAI API error.
        """
        try:
            response = await self._client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=temperature if temperature is not None else settings.llm_temperature,
                max_tokens=max_tokens or settings.llm_max_tokens,
            )
            return response.choices[0].message.content or ""

        except APITimeoutError as exc:
            raise LLMTimeoutError(
                f"OpenAI request timed out after {settings.llm_timeout}s"
            ) from exc
        except APIError as exc:
            raise LLMError(f"OpenAI API error: {exc}") from exc
        except asyncio.TimeoutError as exc:
            raise LLMTimeoutError("Request timed out") from exc


def get_openai_client() -> OpenAIClient:
    """FastAPI dependency factory — returns a fresh client per request."""
    return OpenAIClient()
