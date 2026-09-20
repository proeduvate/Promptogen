from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from core.constants import MAX_QUERY_LENGTH


class AnsweredQuestion(BaseModel):
    """A single clarification question with the user's chosen answer."""

    question_id: int = Field(..., ge=1)
    question: str = Field(..., min_length=1)
    selected_option: str = Field(..., min_length=1)
    custom_input: Optional[str] = Field(None)

    @property
    def effective_answer(self) -> str:
        return self.custom_input.strip() if self.custom_input else self.selected_option


class PromptGenerationRequest(BaseModel):
    original_query: str = Field(..., min_length=1)
    answers: List[AnsweredQuestion] = Field(..., min_length=1)

    @field_validator("original_query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("original_query must not be empty or whitespace only.")
        if len(stripped) > MAX_QUERY_LENGTH:
            raise ValueError(f"original_query must not exceed {MAX_QUERY_LENGTH} characters.")
        return stripped


class PromptGenerationResponse(BaseModel):
    title: str = Field(..., description="Short descriptive title for this prompt.")
    optimized_prompt: str = Field(..., description="The fully structured, optimized prompt.")
    original_query: str = Field(..., description="Echo of the original query for reference.")
