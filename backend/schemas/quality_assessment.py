from typing import List

from pydantic import BaseModel, Field


class PromptAssessmentRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="The prompt to evaluate.")


class PromptAssessmentResponse(BaseModel):
    overall_score: int = Field(..., ge=1, le=100)
    clarity: int = Field(..., ge=1, le=100)
    specificity: int = Field(..., ge=1, le=100)
    suggestions: List[str] = Field(..., description="Concrete improvement suggestions.")
