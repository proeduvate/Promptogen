"""Shared utility for extracting and parsing JSON from raw LLM output."""

import json
import re
from typing import Any


def extract_json(raw: str) -> Any:
    """Extract and parse JSON from a raw LLM response string.

    Handles:
    - Plain JSON strings
    - JSON wrapped in markdown code fences (```json ... ```)
    - Leading / trailing whitespace

    Raises:
        ValueError: if no valid JSON can be extracted.
    """
    text = raw.strip()

    # Strip markdown code fences if present
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fence_match:
        text = fence_match.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Could not parse JSON from LLM response: {exc}") from exc
