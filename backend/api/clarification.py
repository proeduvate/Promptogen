"""Clarification Engine — HTTP layer."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from clients.factory import get_llm_client
from core.exceptions import LLMError, LLMTimeoutError, ParseError
from schemas.clarification import ClarificationRequest, ClarificationResponse
from services.clarification.service import ClarificationService

logger = logging.getLogger("promptgen.api.clarification")

router = APIRouter(prefix="/api/v1", tags=["Clarification"])


# ── Dependency ─────────────────────────────────────────────────────────────────

def get_clarification_service(
    client=Depends(get_llm_client),
) -> ClarificationService:
    return ClarificationService(client=client)


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post(
    "/clarification",
    response_model=ClarificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate adaptive clarification questions",
    description=(
        "Analyzes the depth of the user prompt, identifies intent and missing info, "
        "and dynamically generates adaptive clarification questions with suitable UI types."
    ),
)
async def generate_clarification(
    request: ClarificationRequest,
    service: ClarificationService = Depends(get_clarification_service),
) -> ClarificationResponse:
    logger.info(
        "POST /api/v1/clarification | query_length=%d model=%s",
        len(request.query),
        request.model,
    )

    # If specific model or api_key provided in request, instantiate specialized service
    if request.model or request.api_key or request.provider:
        client = get_llm_client(
            provider=request.provider,
            model=request.model,
            api_key=request.api_key,
        )
        service = ClarificationService(client=client)

    try:
        return await service.generate_questions(request.query)

    except LLMTimeoutError as exc:
        logger.warning("LLM timeout: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The AI service timed out. Please try again.",
        ) from exc

    except LLMError as exc:
        logger.error("LLM error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI service returned an error. Please try again.",
        ) from exc

    except ParseError as exc:
        logger.error("Parse error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not process the AI response: {exc}",
        ) from exc
