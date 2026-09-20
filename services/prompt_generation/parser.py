"""Parse and validate the raw LLM response for the Prompt Generation Engine."""

import logging
from typing import Any

from pydantic import ValidationError

from core.exceptions import ParseError
from schemas.prompt_generation import PromptGenerationResponse
from utils.json_parser import extract_json

logger = logging.getLogger("promptgen.prompt_generation.parser")


class PromptGenerationParser:
    def parse(self, raw: str, original_query: str) -> PromptGenerationResponse:
        data = self._extract(raw)
        return self._validate(data, original_query)

    def _extract(self, raw: str) -> Any:
        try:
            return extract_json(raw)
        except ValueError as exc:
            logger.error("JSON extraction failed: %s", exc)
            raise ParseError(str(exc)) from exc

    def _validate(self, data: Any, original_query: str) -> PromptGenerationResponse:
        if not isinstance(data, dict):
            raise ParseError(f"Expected a JSON object, got {type(data).__name__}.")

        required = ("title", "optimized_prompt")
        for field in required:
            if field not in data:
                raise ParseError(f'LLM response is missing required field: "{field}".')

        if not data.get("optimized_prompt", "").strip():
            raise ParseError('"optimized_prompt" must not be empty.')

        data["original_query"] = original_query

        try:
            return PromptGenerationResponse.model_validate(data)
        except ValidationError as exc:
            raise ParseError(f"Response failed schema validation: {exc}") from exc
