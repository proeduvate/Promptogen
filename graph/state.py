"""Shared state that flows through every node of the PromptGen LangGraph pipeline."""

from typing import List
from typing_extensions import TypedDict


class PromptGenState(TypedDict, total=False):
    # Stage 1: user input
    original_query: str

    # Stage 2: clarification
    questions: List[dict]

    # Stage 3: user answers
    answers: List[dict]

    # Stage 4: prompt generation
    prompt_title: str
    optimized_prompt: str

    # Stage 5: quality assessment
    overall_score: int
    clarity: int
    specificity: int
    suggestions: List[str]
