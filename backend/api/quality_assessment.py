"""Quality Assessment Engine — HTTP layer."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from clients.factory import get_llm_client
from core.exceptions import AssessmentError, LLMError, LLMTimeoutError
from schemas.quality_assessment import PromptAssessmentRequest, PromptAssessmentResponse
from services.quality_assessment.service import QualityAssessmentService

logger = logging.getLogger("promptgen.api.quality_assessment")

router = APIRouter(prefix="/api/v1", tags=["Quality Assessment"])


def get_quality_assessment_service(client=Depends(get_llm_client)) -> QualityAssessmentService:
    return QualityAssessmentService(client=client)


@router.post(
    "/assess-prompt",
    response_model=PromptAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Assess prompt quality",
    description="Evaluates a prompt on clarity and specificity (1-100 each) and provides improvement suggestions.",
)
async def assess_prompt(
    request: PromptAssessmentRequest,
    service: QualityAssessmentService = Depends(get_quality_assessment_service),
) -> PromptAssessmentResponse:
    try:
        return await service.assess(request.prompt)
    except LLMTimeoutError as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="The AI service timed out.") from exc
    except LLMError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="The AI service returned an error.") from exc
    except AssessmentError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Could not process the AI response: {exc}") from exc
