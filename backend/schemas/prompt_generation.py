from typing import Any, List, Optional, Union
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


class RequiredAttachment(BaseModel):
    """External asset or document that should be attached with the final prompt."""

    name: str = Field(..., description="Display name of the attachment (e.g. 'API Specification', 'Wireframe Screenshot').")
    type: str = Field(default="document", description="Type: document, image, dataset, code_file, schema, config.")
    description: str = Field(..., description="Why this attachment is required and what the AI should extract from it.")
    required: bool = Field(default=True, description="Whether this file is mandatory or optional.")
    format_recommendation: Optional[str] = Field(
        None, description="Suggested file format (e.g. .json, .csv, .png, .pdf, .sql)."
    )


class PromptSection(BaseModel):
    """Adaptive section of the structured prompt."""

    id: str = Field(..., description="Identifier for this section (e.g. role, objective, context, input, instructions, requirements, edge_cases, constraints, examples, quality_criteria, output_format, final_instruction).")
    label: str = Field(..., description="Uppercase display label for the UI (e.g. 'ROLE & PERSONA', 'OBJECTIVE', 'INPUT & ATTACHMENTS', 'STEP-BY-STEP PROCESS').")
    type: str = Field(default="text", description="Display style: text, list, numbered, code.")
    content: Optional[str] = Field(None, description="Section text content.")
    items: Optional[List[Any]] = Field(default=None, description="List or numbered items (strings or {key, text} objects).")


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
    optimized_prompt: str = Field(..., description="The fully structured, optimized prompt in markdown.")
    original_query: str = Field(..., description="Echo of the original query for reference.")
    sections: List[PromptSection] = Field(default_factory=list, description="Adaptive structured sections for UI display.")
    required_attachments: List[RequiredAttachment] = Field(default_factory=list, description="External assets/files the user must attach.")


class PipelineFollowUpRequest(BaseModel):
    thread_id: str
    message: str = Field(..., min_length=1, description="Follow-up instruction or question from user.")
    model: Optional[str] = "gemini-3.5-flash-lite"
    api_key: Optional[str] = None
    provider: Optional[str] = None
    current_prompt: Optional[str] = None
    current_sections: Optional[List[dict]] = None
    history_summary: Optional[str] = None


class PipelineFollowUpResponse(BaseModel):
    thread_id: str
    action: str = Field(default="refine_prompt", description="'refine_prompt' or 'clarify'")
    version_label: Optional[str] = None
    prompt_title: Optional[str] = None
    optimized_prompt: Optional[str] = None
    overall_score: Optional[int] = None
    clarity: Optional[int] = None
    specificity: Optional[int] = None
    context: Optional[int] = None
    structure: Optional[int] = None
    actionability: Optional[int] = None
    suggestions: Optional[List[str]] = None
    sections: Optional[List[dict]] = None
    required_attachments: Optional[List[dict]] = None
    questions: Optional[List[dict]] = None
    reasoning: Optional[str] = None
