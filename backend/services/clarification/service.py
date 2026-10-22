"""Clarification Engine — orchestrates the LLM call and response handling."""

import logging
from typing import Any

from core.exceptions import LLMError, LLMTimeoutError, ParseError
from schemas.clarification import ClarificationResponse
from services.clarification.parser import ClarificationParser
from services.clarification.prompts import SYSTEM_PROMPT, build_user_message

logger = logging.getLogger("promptgen.clarification.service")


class ClarificationService:
    """Generates clarification questions for a user query."""

    def __init__(self, client: Any) -> None:
        self._client = client
        self._parser = ClarificationParser()

    async def generate_questions(self, query: str) -> ClarificationResponse:
        """Run the clarification pipeline for query."""
        logger.info("Generating clarification questions | query_length=%d", len(query))
        user_message = build_user_message(query)

        try:
            raw = await self._client.chat_completion(
                system_prompt=SYSTEM_PROMPT,
                user_message=user_message,
            )
        except (LLMTimeoutError, LLMError):
            raise
        except Exception as exc:
            raise LLMError(f"Unexpected error calling LLM: {exc}") from exc

        logger.debug("LLM raw response received | length=%d", len(raw))
        response = self._parser.parse(raw)
        logger.info(
            "Clarification questions generated successfully | count=%d",
            len(response.questions),
        )
        return response
