"""Shared state that flows through every node of the PromptGen LangGraph pipeline."""

from typing import Any, List, Optional
from typing_extensions import TypedDict


class PromptGenState(TypedDict, total=False):
    # Stage 1: user input & config
    original_query: str
    provider: Optional[str]
    model: Optional[str]
    api_key: Optional[str]

    # Stage 2: adaptive clarification & depth analysis
    questions: List[dict]
    is_sufficient: bool
    task_domain: str
    task_intent: str
    depth_analysis: dict

    # Stage 3: user answers
    answers: List[dict]

    # Stage 4: prompt generation
    prompt_title: str
    optimized_prompt: str
    sections: List[dict]
    required_attachments: List[dict]

    # Stage 5: quality assessment
    overall_score: int
    clarity: int
    specificity: int
    context: int
    structure: int
    actionability: int
    suggestions: List[str]

    # Stage 6: self-improvement cycle
    iteration_count: int
    improved: bool
    improvement_notes: Optional[str]
