"""Prompt Generation Engine — HTTP layer."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from clients.factory import get_llm_client
from core.exceptions import LLMError, LLMTimeoutError, ParseError
from schemas.prompt_generation import PromptGenerationRequest, PromptGenerationResponse
from services.prompt_generation.service import PromptGenerationService

logger = logging.getLogger("promptgen.api.prompt_generation")

router = APIRouter(prefix="/api/v1", tags=["Prompt Generation"])


def get_prompt_generation_service(client=Depends(get_llm_client)) -> PromptGenerationService:
    return PromptGenerationService(client=client)


@router.post(
    "/generate-prompt",
    response_model=PromptGenerationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate an optimized prompt",
    description=(
        "Accepts the user's original vague query and their answers to clarification questions. "
        "Returns a fully structured, ready-to-use AI prompt."
    ),
)
async def generate_prompt(
    request: PromptGenerationRequest,
    service: PromptGenerationService = Depends(get_prompt_generation_service),
) -> PromptGenerationResponse:
    try:
        return await service.generate_prompt(request)
    except LLMTimeoutError as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="The AI service timed out.") from exc
    except LLMError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="The AI service returned an error.") from exc
    except ParseError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Could not process the AI response: {exc}") from exc
