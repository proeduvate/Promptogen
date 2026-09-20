"""Prompt Generation Engine — orchestrates LLM call and response handling."""

import logging

from clients.groq_client import GroqClient
from core.exceptions import LLMError, LLMTimeoutError, ParseError
from schemas.prompt_generation import PromptGenerationRequest, PromptGenerationResponse
from services.prompt_generation.parser import PromptGenerationParser
from services.prompt_generation.prompts import SYSTEM_PROMPT, build_user_message

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
            )
        except (LLMTimeoutError, LLMError):
            raise
        except Exception as exc:
            raise LLMError(f"Unexpected error calling LLM: {exc}") from exc

        response = self._parser.parse(raw, original_query=request.original_query)
        logger.info("Optimized prompt generated | title=%r", response.title)
        return response
