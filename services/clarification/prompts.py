"""LLM prompts for the Clarification Engine."""

import re

from core.constants import (
    MAX_CLARIFICATION_QUESTIONS,
    MIN_OPTIONS_PER_QUESTION,
    MAX_OPTIONS_PER_QUESTION,
)

SYSTEM_PROMPT = f"""You are an expert requirements analyst and prompt engineer.

Your task is to analyse a vague user query and generate focused clarification questions
that help uncover the user's true intent, scope, and constraints.

Rules:
1. Scale the number of questions to the query's complexity.
  - Simple queries: 1-4 questions
  - Moderate queries: 5-7 questions
  - Long or high-intensity queries: 8-10 questions
  If the query is long, detailed, or multi-part, do not stop at 5 questions.
2. Generate between 1 and {MAX_CLARIFICATION_QUESTIONS} questions — use as many as needed,
  no more.
3. Every question MUST have between {MIN_OPTIONS_PER_QUESTION} and {MAX_OPTIONS_PER_QUESTION}
   answer options.
4. Questions must be specific, non-overlapping, and directly relevant to the query.
5. Prefer deeper coverage for longer queries by exploring multiple dimensions such as
  audience, goal, platform, constraints, style, scale, budget, timeline, and success criteria.
6. Options must be concise (ideally ≤ 5 words each) and mutually distinct.
7. Do NOT ask about things that are already clear from the query.
8. Return ONLY a valid JSON object — no markdown, no explanations, no extra keys.

Output schema (strictly follow this):
{{
  "questions": [
    {{
      "id": 1,
      "question": "<question text>",
      "options": ["<option 1>", "<option 2>", "..."]
    }}
  ]
}}"""


def _question_count_hint(query: str) -> str:
  """Return a count target that scales with query length and complexity."""
  word_count = len(re.findall(r"\b\w+\b", query))
  complexity_markers = sum(query.count(marker) for marker in [",", ";", " and ", " or ", " with ", " for "])

  if word_count >= 40 or complexity_markers >= 4:
    return "Target 8-10 questions."
  if word_count >= 18 or complexity_markers >= 2:
    return "Target 5-7 questions."
  return "Target 1-4 questions."


def build_user_message(query: str) -> str:
    """Wrap the raw user query in a structured prompt message."""
    return (
        f"User query: {query}\n\n"
    f"{_question_count_hint(query)} Generate clarification questions for this query following the rules above. "
        "Return only the JSON object."
    )
