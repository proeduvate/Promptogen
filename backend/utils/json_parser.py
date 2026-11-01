"""Shared utility for extracting and parsing JSON from raw LLM output."""

import json
import logging
import re
from typing import Any, Optional

logger = logging.getLogger("promptgen.utils.json_parser")


def _sanitize_control_chars(text: str) -> str:
    """Escape literal unescaped control characters inside JSON strings."""
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


def _repair_truncated_json(s: str) -> Optional[Any]:
    """Attempt stack-based recovery of truncated JSON objects."""
    s = s.strip()
    start = s.find("{")
    if start == -1:
        return None
    s = s[start:]

    in_str = False
    escape = False
    stack: list[str] = []
    last_safe_pos = 0

    for idx, ch in enumerate(s):
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if not in_str:
            if ch in ("{", "["):
                stack.append("}" if ch == "{" else "]")
            elif ch in ("}", "]"):
                if stack and stack[-1] == ch:
                    stack.pop()
            elif ch == ",":
                last_safe_pos = idx

    # If inside an unclosed string, close the string
    trimmed = s
    if in_str:
        trimmed += '"'

    trimmed = trimmed.rstrip(" \t\r\n,:")
    suffix = "".join(reversed(stack))
    try:
        return json.loads(trimmed + suffix)
    except Exception:
        pass

    try:
        return json.loads(_sanitize_control_chars(trimmed + suffix))
    except Exception:
        pass

    # Try cutting back to last safe comma position
    if last_safe_pos > 0:
        sub = s[:last_safe_pos].rstrip(" \t\r\n,")
        st: list[str] = []
        in_s = False
        esc = False
        for c in sub:
            if esc:
                esc = False
                continue
            if c == "\\":
                esc = True
                continue
            if c == '"':
                in_s = not in_s
                continue
            if not in_s:
                if c in ("{", "["):
                    st.append("}" if c == "{" else "]")
                elif c in ("}", "]") and st and st[-1] == c:
                    st.pop()
        try:
            return json.loads(sub + "".join(reversed(st)))
        except Exception:
            pass
        try:
            return json.loads(_sanitize_control_chars(sub + "".join(reversed(st))))
        except Exception:
            pass

    return None


def _clean_trailing_commas(s: str) -> str:
    """Strip trailing commas before closing braces/brackets."""
    return re.sub(r",\s*([\]}])", r"\1", s)


def _try_parse(candidate: str) -> Optional[Any]:
    """Try parsing JSON candidate with multiple strategies and strict=False."""
    if not candidate or not candidate.strip():
        return None
    c = candidate.strip()
    for fn in (
        lambda s: json.loads(s, strict=False),
        lambda s: json.loads(_clean_trailing_commas(s), strict=False),
        lambda s: json.loads(_sanitize_control_chars(s), strict=False),
        lambda s: json.loads(_clean_trailing_commas(_sanitize_control_chars(s)), strict=False),
    ):
        try:
            return fn(c)
        except Exception:
            continue
    return None


def extract_json(raw: str) -> Any:
    """Extract and parse JSON from a raw LLM response string.

    Handles:
    - Pure JSON responses
    - JSON enclosed in markdown fences (```json ... ```)
    - JSON containing internal code fences (e.g. ```typescript ... ```)
    - Unescaped control characters in string values
    - Truncated JSON caused by LLM token limits
    """
    text = raw.strip()
    if not text:
        raise ValueError("Could not parse JSON from LLM response: empty text.")

    # 1. Try parsing directly
    res = _try_parse(text)
    if res is not None:
        return res

    # 2. Check for markdown fences anywhere in the text
    fence_matches = re.findall(r"```(?:json)?\s*([\s\S]*?)\s*```", text, flags=re.IGNORECASE)
    for block in fence_matches:
        res = _try_parse(block)
        if res is not None:
            return res

    # Strip outer fence if present but unclosed or mismatched
    if "```" in text:
        stripped = re.sub(r"^[\s\S]*?```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        stripped = re.sub(r"\s*```[\s\S]*$", "", stripped)
        res = _try_parse(stripped)
        if res is not None:
            return res

    # 3. Find outermost structure ({...} or [...]) based on which opens first
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    first_bracket = text.find("[")
    last_bracket = text.rfind("]")

    if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
        if last_brace != -1 and last_brace > first_brace:
            sub = text[first_brace : last_brace + 1]
            res = _try_parse(sub)
            if res is not None:
                return res
    elif first_bracket != -1 and (first_brace == -1 or first_bracket < first_brace):
        if last_bracket != -1 and last_bracket > first_bracket:
            sub = text[first_bracket : last_bracket + 1]
            res = _try_parse(sub)
            if res is not None:
                return res

    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        sub = text[first_brace : last_brace + 1]
        res = _try_parse(sub)
        if res is not None:
            return res

    if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
        sub = text[first_bracket : last_bracket + 1]
        res = _try_parse(sub)
        if res is not None:
            return res

    # 4. Attempt truncated JSON repair (in case token limit was reached)
    repaired = _repair_truncated_json(text)
    if repaired is not None:
        logger.warning("Successfully repaired truncated JSON from LLM response.")
        return repaired

    # 5. Final fallback exception
    raise ValueError(f"Could not parse JSON from LLM response: invalid JSON format.")


# Canonical alias for LangChain structured output parsing
parse_json_from_llm_response = extract_json

