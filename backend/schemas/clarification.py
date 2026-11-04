"""Pydantic schemas for the Adaptive Clarification Engine."""

from typing import Any, List, Literal, Optional, Union
from pydantic import BaseModel, Field, field_validator

from core.constants import (
    MAX_QUERY_LENGTH,
    MIN_CLARIFICATION_QUESTIONS,
    MAX_CLARIFICATION_QUESTIONS,
)

QuestionType = Literal[
    "text",
    "textarea",
    "single_select",
    "multi_select",
    "dropdown",
    "yes_no",
    "date",
    "date_range",
    "number",
    "slider",
    "url",
    "file_upload",
    "custom",
]

QuestionLevel = Literal["required", "recommended", "optional"]


class ClarificationRequest(BaseModel):
    query: str = Field(..., min_length=1, description="The user prompt to analyze.")
    model: Optional[str] = Field(default=None, description="Gemini model to use (e.g. gemini-3.5-flash-lite).")
    api_key: Optional[str] = Field(default=None, description="Optional user Gemini API key.")
    provider: Optional[str] = Field(default=None, description="Provider override (gemini, groq, openai).")

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Query must not be empty or whitespace only.")
        if len(stripped) > MAX_QUERY_LENGTH:
            raise ValueError(
                f"Query must not exceed {MAX_QUERY_LENGTH} characters (got {len(stripped)})."
            )
        return stripped


class AdaptiveQuestion(BaseModel):
    id: Union[str, int] = Field(..., description="Unique question ID or index.")
    question: str = Field(..., min_length=1, description="The clarification question.")
    type: str = Field(
        default="single_select",
        description="Type of UI control: text, textarea, single_select, multi_select, dropdown, yes_no, date, date_range, number, slider, url, file_upload",
    )
    level: str = Field(
        default="recommended",
        description="Importance level: required, recommended, optional",
    )
    description: Optional[str] = Field(
        None, description="Help text explaining why this detail is needed."
    )
    placeholder: Optional[str] = Field(
        None, description="Placeholder text for text/number/url inputs."
    )
    options: List[str] = Field(
        default_factory=list,
        description="Selectable options for single_select, multi_select, or dropdown.",
    )
    allow_custom_input: Optional[bool] = Field(
        True,
        description="Whether user can provide custom write-in answers.",
    )
    default_value: Optional[Any] = Field(
        None, description="Suggested or initial default value."
    )
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    step: Optional[float] = None
    unit: Optional[str] = None  # e.g. "USD", "words", "ms", "users"


class PromptDepthAnalysis(BaseModel):
    task_intent: str = Field(default="", description="What the user is trying to accomplish.")
    task_domain: str = Field(default="general", description="Identified domain: software_development, marketing, content_creation, business_strategy, data_analysis, education, general.")
    info_present: List[str] = Field(default_factory=list, description="Info already clear from prompt.")
    info_missing: List[str] = Field(default_factory=list, description="Critical info missing that cannot be assumed.")
    assumptions_made: List[str] = Field(default_factory=list, description="Info assumed based on context.")
    ambiguities_or_contradictions: List[str] = Field(default_factory=list, description="Ambiguous or conflicting items.")
    expected_output_format: Optional[str] = Field(None, description="Expected deliverable format.")
    key_constraints: List[str] = Field(default_factory=list, description="Identified constraints.")
    is_sufficient: bool = Field(default=False, description="Whether prompt already contains sufficient info to proceed.")


class ClarificationResponse(BaseModel):
    prompt_title: Optional[str] = Field(
        None,
        description="Concise 3-6 word Title Case title capturing the core intent of the prompt.",
    )
    depth_analysis: Optional[PromptDepthAnalysis] = None
    is_sufficient: bool = False
    task_domain: str = "general"
    task_intent: Optional[str] = None
    questions: List[AdaptiveQuestion] = Field(
        default_factory=list,
        description="Dynamically generated adaptive questions.",
    )
