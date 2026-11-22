"""Pydantic schemas for the Prompt Readiness API contract."""

from typing import Any, List, Literal, Optional, Union
from pydantic import BaseModel, Field

ReadinessStatus = Literal["needs_more_details", "partially_ready", "ready_to_generate"]
ImportanceLevel = Literal["required", "recommended", "optional", "unclassified"]
SeverityLevel = Literal["info", "warning", "error"]


class ReadinessAnswerInput(BaseModel):
    question_id: Union[int, str]
    question: Optional[str] = ""
    selected_option: Optional[Union[str, List[str]]] = ""
    custom_input: Optional[str] = ""


class ContextAdditionInput(BaseModel):
    gap_id: str
    value: str
    label: Optional[str] = None


class ReadinessAnalysisRequest(BaseModel):
    thread_id: str
    client_revision: Optional[int] = None
    answers: List[ReadinessAnswerInput] = Field(default_factory=list)
    context_additions: List[ContextAdditionInput] = Field(default_factory=list)
    additional_context: Optional[str] = ""


class ReadinessScore(BaseModel):
    percentage: int = Field(..., ge=0, le=100)
    status: ReadinessStatus


class CollectedContextItem(BaseModel):
    id: str
    label: str
    value: str
    source: Optional[str] = None
    question_id: Optional[Union[int, str]] = None


class MissingContextGap(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    importance: ImportanceLevel = "recommended"
    question_id: Optional[Union[int, str]] = None
    input_hint: Optional[str] = None


class ReadinessWarning(BaseModel):
    code: Optional[str] = None
    severity: SeverityLevel = "warning"
    message: str


class GenerationPolicy(BaseModel):
    can_generate: bool = False
    can_generate_anyway: bool = False
    reason: Optional[str] = None


class ReadinessAnalysisResponse(BaseModel):
    thread_id: str
    client_revision: Optional[int] = None
    analysis_id: str
    readiness: ReadinessScore
    collected_context: List[CollectedContextItem]
    missing_context: List[MissingContextGap]
    warnings: List[ReadinessWarning]
    generation_policy: GenerationPolicy
