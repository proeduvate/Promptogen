"""LLM prompts for the Clarification Engine."""

from core.constants import (
    MIN_OPTIONS_PER_QUESTION,
    MAX_OPTIONS_PER_QUESTION,
)

SYSTEM_PROMPT = f"""You are an expert requirements analyst and prompt engineer.

Your task is to analyse a vague user query and generate focused clarification questions
that help uncover the user's true intent, scope, and constraints.

Rules:
1. Generate exactly 10 questions for every query.
2. Every question MUST have between {MIN_OPTIONS_PER_QUESTION} and {MAX_OPTIONS_PER_QUESTION}
   answer options.
3. Questions must be specific, non-overlapping, and directly relevant to the query.
4. Cover multiple dimensions such as audience, goal, platform, constraints, style, scale,
  budget, timeline, and success criteria.
5. Options must be concise (ideally ≤ 5 words each) and mutually distinct.
6. Do NOT ask about things that are already clear from the query.
7. Return ONLY a valid JSON object — no markdown, no explanations, no extra keys.

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


def build_user_message(query: str) -> str:
    """Wrap the raw user query in a structured prompt message."""
    return (
        f"User query: {query}\n\n"
    "Generate exactly 10 clarification questions for this query following the rules above. "
        "Return only the JSON object."
    )
