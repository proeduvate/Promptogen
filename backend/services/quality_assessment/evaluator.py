"""Parse and validate the raw LLM response for the Quality Assessment Engine."""

import logging
import re
from typing import Any, Optional

from core.exceptions import AssessmentError
from utils.json_parser import extract_json

logger = logging.getLogger("promptgen.quality_assessment.evaluator")


def _extract_scores_fallback(text: str) -> Optional[dict]:
    score_fields = ["overall_score", "clarity", "specificity", "context", "structure", "actionability"]
    scores: dict = {}
    found_any = False
    for f in score_fields:
        m = re.search(rf'"{f}"\s*:\s*(\d+)', text)
        if m:
            scores[f] = max(1, min(100, int(m.group(1))))
            found_any = True
        else:
            scores[f] = 90

    if not found_any:
        return None

    # Try extracting suggestions list
    sugg_block = re.search(r'"suggestions"\s*:\s*\[([\s\S]*?)\]', text)
    if sugg_block:
        suggs = re.findall(r'"([^"\n\r]{5,200})"', sugg_block.group(1))
        scores["suggestions"] = suggs if suggs else ["Review prompt output against target criteria."]
    else:
        scores["suggestions"] = ["Review prompt output against target criteria."]

    return scores


def parse_llm_response(raw_text: str) -> dict:
    try:
        data: Any = extract_json(raw_text)
    except Exception as exc:
        data = _extract_scores_fallback(raw_text)
        if data is not None:
            return data
        raise AssessmentError(f"Model did not return valid JSON: {exc}") from exc

    if not isinstance(data, dict):
        fallback = _extract_scores_fallback(raw_text)
        if fallback is not None:
            return fallback
        raise AssessmentError(f"Expected a JSON object, got {type(data).__name__}.")

    score_fields = ["overall_score", "clarity", "specificity", "context", "structure", "actionability"]
    required_fields = [*score_fields, "suggestions"]
    missing = [f for f in required_fields if f not in data]
    if missing:
        raise AssessmentError(f"Model response missing fields: {missing}")

    for field in score_fields:
        try:
            data[field] = max(1, min(100, int(data[field])))
        except (TypeError, ValueError) as exc:
            raise AssessmentError(f"Field '{field}' must be a number: {exc}") from exc

    if not isinstance(data["suggestions"], list):
        raise AssessmentError("'suggestions' must be a list of strings.")

    return data
