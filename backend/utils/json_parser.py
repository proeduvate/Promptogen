"""Shared utility for extracting and parsing JSON from raw LLM output."""

import json
import re
from typing import Any


def _sanitize_control_chars(text: str) -> str:
    """Escape literal control characters that appear inside JSON string values."""
    result: list[str] = []
    in_string = False
    escape_next = False

    _escape_map = {
        "\n": "\\n",
        "\r": "\\r",
        "\t": "\\t",
        "\b": "\\b",
        "\f": "\\f",
    }

    for ch in text:
        if escape_next:
            result.append(ch)
            escape_next = False
            continue

        if ch == "\\":
            result.append(ch)
            escape_next = True
            continue

        if ch == '"':
            in_string = not in_string
            result.append(ch)
            continue

        if in_string:
            if ch in _escape_map:
                result.append(_escape_map[ch])
            elif ord(ch) < 32:
                pass
            else:
                result.append(ch)
        else:
            result.append(ch)

    return "".join(result)


def extract_json(raw: str) -> Any:
    """Extract and parse JSON from a raw LLM response string.

    Handles:
    - Plain JSON strings
    - JSON wrapped in markdown code fences (```json ... ```)
    - Leading / trailing whitespace
    - Literal control characters (newlines, tabs) inside string values

    Raises:
        ValueError: if no valid JSON can be extracted.
    """
    text = raw.strip()

    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fence_match:
        text = fence_match.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    try:
        return json.loads(_sanitize_control_chars(text))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Could not parse JSON from LLM response: {exc}") from exc
