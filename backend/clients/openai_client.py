"""Async OpenAI client wrapper — shared across all engine developers."""

import asyncio
from typing import Optional

from openai import AsyncOpenAI, APITimeoutError, APIError

from clients.tracing import create_llm_run, post_llm_run
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
        self.api_key = api_key or settings.openai_api_key
        self._client = AsyncOpenAI(
            api_key=self.api_key,
            timeout=timeout or settings.llm_timeout,
        )
        self.model = model or settings.openai_model
        self.provider = "openai"

    async def chat_completion(
        self,
        system_prompt: str,
        user_message: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        response_format: Optional[dict] = None,
    ) -> str:
        """Send a chat-completion request and return the assistant message text.

        Raises:
            LLMTimeoutError: on request timeout.
            LLMError: on any other OpenAI API error.
        """
        if not self.api_key or self.api_key.startswith("your_") or self.api_key.startswith("sk-placeholder"):
            raise LLMError(
                "OpenAI API key is not configured. Please supply OPENAI_API_KEY in .env or provide an API key in the UI."
            )

        run = create_llm_run(
            name=f"OpenAI Completion [{self.model}]",
            inputs={"system_prompt": system_prompt, "user_message": user_message},
            provider="openai",
            model=self.model,
        )
        try:
            kwargs = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "temperature": temperature if temperature is not None else settings.llm_temperature,
                "max_tokens": max_tokens or settings.llm_max_tokens,
            }
            if response_format:
                kwargs["response_format"] = response_format

            response = await self._client.chat.completions.create(**kwargs)
            res = response.choices[0].message.content or ""
            await post_llm_run(run, outputs={"response": res})
            return res

        except APITimeoutError as exc:
            err = LLMTimeoutError(
                f"OpenAI request timed out after {settings.llm_timeout}s"
            )
            await post_llm_run(run, error=str(err))
            raise err from exc
        except APIError as exc:
            err = LLMError(f"OpenAI API error: {exc}")
            await post_llm_run(run, error=str(err))
            raise err from exc
        except asyncio.TimeoutError as exc:
            err = LLMTimeoutError("Request timed out")
            await post_llm_run(run, error=str(err))
            raise err from exc
        except Exception as exc:
            await post_llm_run(run, error=str(exc))
            raise


def get_openai_client() -> OpenAIClient:
    """FastAPI dependency factory — returns a fresh client per request."""
    return OpenAIClient()
