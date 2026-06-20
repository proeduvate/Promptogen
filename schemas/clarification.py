from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from core.constants import (
    MAX_QUERY_LENGTH,
    MAX_CLARIFICATION_QUESTIONS,
    MIN_OPTIONS_PER_QUESTION,
    MAX_OPTIONS_PER_QUESTION,
)


class ClarificationRequest(BaseModel):
    query: str = Field(..., min_length=1, description="The vague user query to clarify.")

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Query must not be empty or whitespace only.")
        if len(stripped) > MAX_QUERY_LENGTH:
            raise ValueError(
                f"Query must not exceed {MAX_QUERY_LENGTH} characters "
                f"(got {len(stripped)})."
            )
        return stripped


class ClarificationQuestion(BaseModel):
    id: int = Field(..., ge=1, description="1-based question index.")
    question: str = Field(..., min_length=1, description="The clarification question.")
    options: List[str] = Field(
        ...,
        min_length=MIN_OPTIONS_PER_QUESTION,
        max_length=MAX_OPTIONS_PER_QUESTION,
        description="Answer options (2–5 items).",
    )
    allow_custom_input: Optional[bool] = Field(
        False,
        description="Whether the user may type a free-text answer in addition to the options.",
    )


class ClarificationResponse(BaseModel):
    questions: List[ClarificationQuestion] = Field(
        ...,
        min_length=1,
        max_length=MAX_CLARIFICATION_QUESTIONS,
        description="Up to 10 clarification questions.",
    )
