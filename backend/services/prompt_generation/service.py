"""Prompt Generation Engine — orchestrates LLM call and response handling."""

import logging
from typing import Any, Optional

from clients.groq_client import GroqClient
from core.exceptions import LLMError, LLMTimeoutError, ParseError
from schemas.prompt_generation import PromptGenerationRequest, PromptGenerationResponse
from services.prompt_generation.parser import PromptGenerationParser
from services.prompt_generation.prompts import (
    FOLLOWUP_SYSTEM_PROMPT,
    SYSTEM_PROMPT,
    build_followup_message,
    build_user_message,
)
from utils.json_parser import extract_json

logger = logging.getLogger("promptgen.prompt_generation.service")


class PromptGenerationService:
    def __init__(self, client: GroqClient) -> None:
        self._client = client
        self._parser = PromptGenerationParser()

    async def generate_prompt(self, request: PromptGenerationRequest) -> PromptGenerationResponse:
        logger.info(
            "Generating optimized prompt | query_length=%d answers=%d",
            len(request.original_query), len(request.answers),
        )
        user_message = build_user_message(request.original_query, request.answers)
        try:
            raw = await self._client.chat_completion(
                system_prompt=SYSTEM_PROMPT,
                user_message=user_message,
                max_tokens=8192,
            )
        except (LLMTimeoutError, LLMError):
            raise
        except Exception as exc:
            raise LLMError(f"Unexpected error calling LLM: {exc}") from exc

        response = self._parser.parse(raw, original_query=request.original_query)
        logger.info("Optimized prompt generated | title=%r", response.title)
        return response

    async def refine_prompt_followup(
        self,
        original_query: str,
        current_prompt: str,
        user_followup: str,
        history_summary: str = "",
    ) -> dict:
        logger.info(
            "Refining prompt via conversational follow-up | followup_len=%d",
            len(user_followup),
        )
        user_message = build_followup_message(
            original_query=original_query,
            current_prompt=current_prompt,
            user_followup=user_followup,
            history_summary=history_summary,
        )
        try:
            raw = await self._client.chat_completion(
                system_prompt=FOLLOWUP_SYSTEM_PROMPT,
                user_message=user_message,
                max_tokens=8192,
            )
        except (LLMTimeoutError, LLMError):
            raise
        except Exception as exc:
            raise LLMError(f"Unexpected error calling LLM for follow-up: {exc}") from exc

        try:
            data = self._parser._extract(raw)
        except Exception as exc:
            raise ParseError(f"Follow-up LLM response parsing failed: {exc}") from exc
        if not isinstance(data, dict):
            raise ParseError("Follow-up LLM response must be a JSON object.")

        action = str(data.get("action") or "refine_prompt").strip()

        if action == "clarify":
            questions = data.get("questions") or []
            return {
                "action": "clarify",
                "reasoning": data.get("reasoning", "Additional clarification needed to refine the prompt."),
                "questions": questions,
            }

        # If refine_prompt:
        if "title" not in data and "prompt_title" in data:
            data["title"] = data["prompt_title"]
        parsed = self._parser._validate(data, original_query=original_query)
        return {
            "action": "refine_prompt",
            "version_label": data.get("version_label", "Refined Prompt"),
            "prompt_title": parsed.title,
            "optimized_prompt": parsed.optimized_prompt,
            "sections": [s.model_dump() for s in parsed.sections],
            "required_attachments": [a.model_dump() for a in parsed.required_attachments],
        }
