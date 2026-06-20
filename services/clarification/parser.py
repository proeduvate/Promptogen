"""Parse and validate the raw LLM response for the Clarification Engine."""

import logging
from typing import Any

from pydantic import ValidationError

from core.constants import (
    MAX_CLARIFICATION_QUESTIONS,
    MIN_OPTIONS_PER_QUESTION,
    MAX_OPTIONS_PER_QUESTION,
)
from core.exceptions import ParseError
from schemas.clarification import ClarificationQuestion, ClarificationResponse
from utils.json_parser import extract_json

logger = logging.getLogger("promptgen.clarification.parser")


class ClarificationParser:
    """Converts a raw LLM string into a validated ClarificationResponse."""

    def parse(self, raw: str) -> ClarificationResponse:
        """Parse *raw* LLM output and return a validated response.

        Raises:
            ParseError: if the JSON is malformed or fails schema validation.
        """
        data = self._extract(raw)
        questions = self._validate_questions(data)
        return ClarificationResponse(questions=questions)

    # ── private helpers ────────────────────────────────────────────────────

    def _extract(self, raw: str) -> Any:
        try:
            return extract_json(raw)
        except ValueError as exc:
            logger.error("JSON extraction failed: %s", exc)
            raise ParseError(str(exc)) from exc

    def _validate_questions(self, data: Any) -> list[ClarificationQuestion]:
        if not isinstance(data, dict):
            raise ParseError(
                f"Expected a JSON object at the top level, got {type(data).__name__}."
            )

        raw_questions = data.get("questions")
        if not isinstance(raw_questions, list) or len(raw_questions) == 0:
            raise ParseError(
                'LLM response must contain a non-empty "questions" array.'
            )

        if len(raw_questions) > MAX_CLARIFICATION_QUESTIONS:
            logger.warning(
                "LLM returned %d questions; truncating to %d.",
                len(raw_questions),
                MAX_CLARIFICATION_QUESTIONS,
            )
            raw_questions = raw_questions[:MAX_CLARIFICATION_QUESTIONS]

        questions: list[ClarificationQuestion] = []
        for idx, item in enumerate(raw_questions, start=1):
            question = self._parse_single(item, idx)
            questions.append(question)

        return questions

    def _parse_single(self, item: Any, idx: int) -> ClarificationQuestion:
        if not isinstance(item, dict):
            raise ParseError(
                f"Question at position {idx} must be a JSON object, "
                f"got {type(item).__name__}."
            )

        # Normalise id — always use sequential index regardless of what LLM returned
        item["id"] = idx

        # Validate options length before Pydantic to give a clearer error
        options = item.get("options", [])
        if not isinstance(options, list):
            raise ParseError(
                f"Question {idx}: 'options' must be an array, "
                f"got {type(options).__name__}."
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
            item["options"] = options[:MAX_OPTIONS_PER_QUESTION]

        try:
            return ClarificationQuestion.model_validate(item)
        except ValidationError as exc:
            raise ParseError(
                f"Question {idx} failed schema validation: {exc}"
            ) from exc
