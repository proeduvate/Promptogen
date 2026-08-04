"""Parse and validate the raw LLM response for the Quality Assessment Engine."""

import logging
from typing import Any

from core.exceptions import AssessmentError
from utils.json_parser import extract_json

logger = logging.getLogger("promptgen.quality_assessment.evaluator")


def parse_llm_response(raw_text: str) -> dict:
    try:
        data: Any = extract_json(raw_text)
    except ValueError as exc:
        raise AssessmentError(f"Model did not return valid JSON: {exc}") from exc

    if not isinstance(data, dict):
        raise AssessmentError(f"Expected a JSON object, got {type(data).__name__}.")

    required_fields = ["overall_score", "clarity", "specificity", "suggestions"]
    missing = [f for f in required_fields if f not in data]
    if missing:
        raise AssessmentError(f"Model response missing fields: {missing}")

    for field in ["overall_score", "clarity", "specificity"]:
        try:
            data[field] = max(1, min(100, int(data[field])))
        except (TypeError, ValueError) as exc:
            raise AssessmentError(f"Field '{field}' must be a number: {exc}") from exc

    if not isinstance(data["suggestions"], list):
        raise AssessmentError("'suggestions' must be a list of strings.")

    return data
