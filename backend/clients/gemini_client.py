"""Async Gemini client wrapper — supports Gemini free-tier models.

Uses Google Generative Language REST API with OpenAI-compatible fallback.
"""

import asyncio
import json
import logging
from typing import List, Optional

import httpx

from core.config import settings
from core.exceptions import LLMError, LLMTimeoutError

logger = logging.getLogger("promptgen.clients.gemini")

_MAX_RETRIES = 3
_RETRY_DELAYS = [1.0, 2.0, 4.0]

# Standard free-tier eligible Gemini models (updated to active 3.x generation)
GEMINI_FREE_TIER_MODELS = [
    {
        "id": "gemini-3.5-flash-lite",
        "name": "Gemini 3.5 Flash-Lite",
        "label": "Gemini 3.5 Flash-Lite",
        "badge": "Fastest & Recommended (Free Tier)",
        "description": "Ultra lightweight, active free tier, low-latency reasoning",
        "free_tier": True,
        "recommended": True,
        "limits": "30 RPM / 1M TPM / 1,500 RPD",
    },
    {
        "id": "gemini-3.5-flash",
        "name": "Gemini 3.5 Flash",
        "label": "Gemini 3.5 Flash",
        "badge": "High Speed Multimodal",
        "description": "Balanced high performance and reasoning",
        "free_tier": True,
        "recommended": False,
        "limits": "15 RPM / 1M TPM / 1,500 RPD",
    },
    {
        "id": "gemini-3.8-flash",
        "name": "Gemini 3.8 Flash",
        "label": "Gemini 3.8 Flash",
        "badge": "Latest Architecture",
        "description": "Latest Gemini model with advanced analytical capabilities",
        "free_tier": True,
        "recommended": False,
        "limits": "15 RPM / 1M TPM / 1,500 RPD",
    },
    {
        "id": "gemini-3.1-flash-lite",
        "name": "Gemini 3.1 Flash-Lite",
        "label": "Gemini 3.1 Flash-Lite",
        "badge": "High Throughput",
        "description": "Lightweight model optimized for rapid classification",
        "free_tier": True,
        "recommended": False,
        "limits": "30 RPM / 1M TPM / 1,500 RPD",
    },
    {
        "id": "gemini-3.1-pro-preview",
        "name": "Gemini 3.1 Pro Preview",
        "label": "Gemini 3.1 Pro Preview",
        "badge": "Advanced Reasoning",
        "description": "State-of-the-art coding and complex architectural analysis",
        "free_tier": True,
        "recommended": False,
        "limits": "2 RPM / 32K TPM / 50 RPD",
    },
]


class GeminiClient:
    """Async wrapper for Google Gemini API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.api_key = (
            api_key
            or getattr(settings, "gemini_api_key", None)
            or getattr(settings, "groq_api_key", "")
        )
        self.model = (
            model
            or getattr(settings, "gemini_model", None)
            or "gemini-3.5-flash-lite"
        )
        self.timeout = timeout or settings.llm_timeout

    async def chat_completion(
        self,
        system_prompt: str,
        user_message: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        response_format: Optional[dict] = None,
    ) -> str:
        """Call Gemini API and return raw response text."""
        temp = temperature if temperature is not None else settings.llm_temperature
        tokens = max_tokens or settings.llm_max_tokens

        # Check if we have an active API key
        if not self.api_key or self.api_key.startswith("gsk-placeholder") or self.api_key == "your_gemini_api_key":
            raise LLMError(
                "Gemini API key is not configured. Please add GEMINI_API_KEY to your backend/.env file "
                "or enter it in the Gemini Model settings panel."
            )

        last_error = None
        for attempt, delay in enumerate(_RETRY_DELAYS, start=1):
            try:
                return await self._call_gemini_rest(
                    system_prompt=system_prompt,
                    user_message=user_message,
                    temperature=temp,
                    max_tokens=tokens,
                )
            except (LLMTimeoutError, httpx.TimeoutException) as exc:
                last_error = exc
                logger.warning(
                    "Gemini API timeout (attempt %d/%d), retrying in %.1fs: %s",
                    attempt,
                    _MAX_RETRIES,
                    delay,
                    exc,
                )
            except LLMError as exc:
                err_str = str(exc)
                if any(k in err_str for k in ["400", "401", "403", "404", "API key", "API_KEY_INVALID", "no longer available"]):
                    raise
                last_error = exc
                logger.warning(
                    "Gemini API error (attempt %d/%d), retrying in %.1fs: %s",
                    attempt,
                    _MAX_RETRIES,
                    delay,
                    exc,
                )
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Gemini API error (attempt %d/%d), retrying in %.1fs: %s",
                    attempt,
                    _MAX_RETRIES,
                    delay,
                    exc,
                )
            if attempt < _MAX_RETRIES:
                await asyncio.sleep(delay)

        raise LLMError(f"Gemini API error after {_MAX_RETRIES} attempts: {last_error}")

    async def _call_gemini_rest(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Call Google Generative Language v1beta generateContent endpoint."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

        payload = {
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_message}]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as http_client:
            resp = await http_client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )

            if resp.status_code != 200:
                err_detail = resp.text
                try:
                    err_json = resp.json()
                    if "error" in err_json and isinstance(err_json["error"], dict):
                        err_detail = err_json["error"].get("message", err_detail)
                except Exception:
                    pass
                raise LLMError(f"Gemini API Error ({resp.status_code}): {err_detail}")

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise LLMError(f"No response candidates returned by Gemini: {data}")

            candidate = candidates[0]
            finish_reason = candidate.get("finishReason")
            if finish_reason == "MAX_TOKENS":
                logger.warning(
                    "Gemini generation reached maxOutputTokens limit (%d)! Prompt output was truncated by model token cap.",
                    max_tokens,
                )

            content_parts = candidate.get("content", {}).get("parts", [])
            if not content_parts:
                raise LLMError("Empty response content from Gemini")

            return content_parts[0].get("text", "")

    async def _call_gemini_openai_compat(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Fallback to Gemini's OpenAI-compatible endpoint."""
        from openai import AsyncOpenAI
        client = AsyncOpenAI(
            api_key=self.api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            timeout=self.timeout,
        )
        response = await client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content or ""
