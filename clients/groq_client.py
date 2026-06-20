"""Async Groq client wrapper — same interface as openai_client.py."""

import asyncio
from typing import Optional

from groq import AsyncGroq, APITimeoutError, APIError

from core.config import settings
from core.exceptions import LLMError, LLMTimeoutError


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

        Raises:
            LLMTimeoutError: on request timeout.
            LLMError: on any other Groq API error.
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
                f"Groq request timed out after {settings.llm_timeout}s"
            ) from exc
        except APIError as exc:
            raise LLMError(f"Groq API error: {exc}") from exc
        except asyncio.TimeoutError as exc:
            raise LLMTimeoutError("Request timed out") from exc


def get_groq_client() -> GroqClient:
    """FastAPI dependency factory — returns a fresh Groq client per request."""
    return GroqClient()
