from typing import List, Optional

from pydantic import BaseModel, Field


class PromptAssessmentRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="The prompt to evaluate.")


class PromptAssessmentResponse(BaseModel):
    assessment_id: Optional[str] = Field(default=None, description="Database id for the saved assessment, when persistence is enabled.")
    overall_score: int = Field(..., ge=1, le=100)
    clarity: int = Field(..., ge=1, le=100)
    specificity: int = Field(..., ge=1, le=100)
    context: int = Field(..., ge=1, le=100)
    structure: int = Field(..., ge=1, le=100)
    actionability: int = Field(..., ge=1, le=100)
    suggestions: List[str] = Field(..., description="Concrete improvement suggestions.")
