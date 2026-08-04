"""Quality Assessment Engine — orchestrates the LLM call and response handling."""

import logging

from clients.groq_client import GroqClient
from core.exceptions import AssessmentError, LLMError, LLMTimeoutError
from schemas.quality_assessment import PromptAssessmentResponse
from services.quality_assessment.evaluator import parse_llm_response
from services.quality_assessment.prompts import SYSTEM_PROMPT, build_user_message

logger = logging.getLogger("promptgen.quality_assessment.service")


class QualityAssessmentService:
    def __init__(self, client: GroqClient) -> None:
        self._client = client

    async def assess(self, prompt_text: str) -> PromptAssessmentResponse:
        logger.info("Assessing prompt quality | prompt_length=%d", len(prompt_text))
        user_message = build_user_message(prompt_text)
        try:
            raw = await self._client.chat_completion(
                system_prompt=SYSTEM_PROMPT,
                user_message=user_message,
            )
        except (LLMTimeoutError, LLMError):
            raise
        except Exception as exc:
            raise LLMError(f"Unexpected error calling LLM: {exc}") from exc

        data = parse_llm_response(raw)
        response = PromptAssessmentResponse(**data)
        logger.info(
            "Quality assessment complete | overall=%d clarity=%d specificity=%d",
            response.overall_score, response.clarity, response.specificity,
        )
        return response
