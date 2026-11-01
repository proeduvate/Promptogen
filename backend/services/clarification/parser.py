"""Parse and validate the raw LLM response for the Clarification Engine."""

import logging
from typing import Any, List

from core.constants import (
    MIN_CLARIFICATION_QUESTIONS,
    MAX_CLARIFICATION_QUESTIONS,
    MIN_OPTIONS_PER_QUESTION,
    MAX_OPTIONS_PER_QUESTION,
)
from core.exceptions import ParseError
from schemas.clarification import AdaptiveQuestion, ClarificationResponse, PromptDepthAnalysis
from utils.json_parser import extract_json

logger = logging.getLogger("promptgen.clarification.parser")


class ClarificationParser:
    """Converts a raw LLM string into a validated ClarificationResponse."""

    def parse(self, raw: str) -> ClarificationResponse:
        data = self._extract(raw)
        if not isinstance(data, dict):
            raise ParseError(
                f"Expected a JSON object at the top level, got {type(data).__name__}."
            )

        if "questions" not in data or not isinstance(data.get("questions"), list):
            raise ParseError('LLM response must contain a "questions" array.')

        raw_questions = data["questions"]
        is_sufficient = bool(data.get("is_sufficient", False))
        if len(raw_questions) == 0:
            is_sufficient = True

        questions: List[AdaptiveQuestion] = []
        for idx, item in enumerate(raw_questions, start=1):
            q = self._parse_single(item, idx)
            questions.append(q)

        # Depth analysis
        raw_analysis = data.get("depth_analysis") or {}
        depth_analysis = None
        if isinstance(raw_analysis, dict) and raw_analysis:
            depth_analysis = PromptDepthAnalysis(
                task_intent=str(raw_analysis.get("task_intent", "")),
                task_domain=str(raw_analysis.get("task_domain", data.get("task_domain", "general"))),
                info_present=list(raw_analysis.get("info_present", [])),
                info_missing=list(raw_analysis.get("info_missing", [])),
                assumptions_made=list(raw_analysis.get("assumptions_made", [])),
                ambiguities_or_contradictions=list(raw_analysis.get("ambiguities_or_contradictions", [])),
                expected_output_format=raw_analysis.get("expected_output_format"),
                key_constraints=list(raw_analysis.get("key_constraints", [])),
                is_sufficient=bool(raw_analysis.get("is_sufficient", False)),
            )

        raw_title = str(data.get("prompt_title") or "").strip()
        prompt_title = raw_title if raw_title else None

        return ClarificationResponse(
            prompt_title=prompt_title,
            depth_analysis=depth_analysis,
            is_sufficient=bool(data.get("is_sufficient", False)),
            task_domain=str(data.get("task_domain", "general")),
            task_intent=str(data.get("task_intent", "")),
            questions=questions,
        )

    def _extract(self, raw: str) -> Any:
        try:
            return extract_json(raw)
        except ValueError as exc:
            logger.error("JSON extraction failed: %s", exc)
            raise ParseError(str(exc)) from exc

    def _parse_single(self, item: Any, idx: int) -> AdaptiveQuestion:
        if not isinstance(item, dict):
            raise ParseError(
                f"Question at position {idx} must be a JSON object, got {type(item).__name__}."
            )

        # Normalise id — always use sequential index as integer
        item_id = idx

        # Validate options
        options = item.get("options")
        if not isinstance(options, list):
            raise ParseError(
                f"Question {idx}: 'options' must be an array, got {type(options).__name__}."
            )
        if len(options) < MIN_OPTIONS_PER_QUESTION:
            raise ParseError(
                f"Question {idx}: 'options' must have at least "
                f"{MIN_OPTIONS_PER_QUESTION} items (got {len(options)})."
            )
        if len(options) > MAX_OPTIONS_PER_QUESTION:
            logger.warning(
                "Question %d has %d options; truncating to %d.",
                idx,
                len(options),
                MAX_OPTIONS_PER_QUESTION,
            )
            options = options[:MAX_OPTIONS_PER_QUESTION]

        clean_options = [str(o).strip() for o in options]
        q_text = str(item.get("question") or f"Question {idx}").strip()

        # Type & level
        q_type = str(item.get("type") or "single_select").lower()
        q_level = str(item.get("level") or ("required" if idx <= 3 else "recommended")).lower()

        return AdaptiveQuestion(
            id=item_id,
            question=q_text,
            type=q_type,
            level=q_level,
            description=item.get("description"),
            placeholder=item.get("placeholder"),
            options=clean_options,
            allow_custom_input=bool(item.get("allow_custom_input", False)),
            default_value=item.get("default_value"),
            min_value=item.get("min_value"),
            max_value=item.get("max_value"),
            step=item.get("step"),
            unit=item.get("unit"),
        )
