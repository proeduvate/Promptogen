"""Parse and validate the raw LLM response for the Prompt Generation Engine."""

import logging
import re
from typing import Any, List, Optional, Dict

from pydantic import ValidationError

from core.exceptions import ParseError
from schemas.prompt_generation import (
    PromptGenerationResponse,
    PromptSection,
    RequiredAttachment,
)
from utils.json_parser import extract_json

logger = logging.getLogger("promptgen.prompt_generation.parser")


class PromptGenerationParser:
    def parse(self, raw: str, original_query: str) -> PromptGenerationResponse:
        data = self._extract(raw)
        return self._validate(data, original_query)

    def _extract(self, raw: str) -> Any:
        try:
            data = extract_json(raw)
            if isinstance(data, dict):
                return data
            logger.warning(
                "extract_json returned non-dict (%s). Attempting fallback prompt extraction.",
                type(data).__name__,
            )
        except Exception as exc:
            logger.warning(
                "extract_json failed: %s. Attempting fallback prompt extraction.",
                exc,
            )

        fallback = self._extract_prompt_fallback(raw)
        if fallback:
            return fallback
        raise ParseError("Could not extract structured prompt from LLM response.")

    def _extract_prompt_fallback(self, raw: str) -> Optional[dict]:
        text = raw.strip()
        if not text:
            return None

        # 1. If it has JSON-like keys for title or prompt
        title_m = re.search(r'"(?:prompt_)?title"\s*:\s*"([^"\n\r]+)"', text)
        title = title_m.group(1).strip() if title_m else "Optimized Prompt"

        prompt_m = re.search(r'"(?:optimized_)?prompt"\s*:\s*"([\s\S]*?)"\s*,\s*"[a-zA-Z_]+"\s*:', text)
        if not prompt_m:
            prompt_m = re.search(r'"(?:optimized_)?prompt"\s*:\s*"([\s\S]*?)"\s*\}', text)

        if prompt_m:
            prompt_content = prompt_m.group(1).strip()
            prompt_content = (
                prompt_content
                .replace("\\n", "\n")
                .replace('\\"', '"')
                .replace("\\t", "\t")
            )
            return {
                "title": title,
                "optimized_prompt": prompt_content,
                "required_attachments": [],
            }

        # 2. If the raw text is markdown prompt content
        if "###" in text or text.startswith("#") or len(text) > 80:
            first_line = text.split("\n")[0].strip("# \t\r")
            if first_line and len(first_line) < 60:
                title = first_line
            return {
                "title": title,
                "optimized_prompt": text,
                "required_attachments": [],
            }

        return None

    def _validate(self, data: Any, original_query: str) -> PromptGenerationResponse:
        if not isinstance(data, dict):
            raise ParseError(f"Expected a JSON object, got {type(data).__name__}.")

        # Normalize title / prompt_title
        title = data.get("title") or data.get("prompt_title")
        if not title:
            title = "Optimized Prompt"
        data["title"] = str(title).strip()

        # Normalize optimized_prompt / prompt / refined_prompt
        optimized_prompt = (
            data.get("optimized_prompt")
            or data.get("prompt")
            or data.get("refined_prompt")
            or ""
        )
        optimized_prompt = str(optimized_prompt).strip()
        if not optimized_prompt:
            raise ParseError('LLM response is missing required field: "optimized_prompt".')

        data["original_query"] = original_query
        data["optimized_prompt"] = optimized_prompt

        # Process sections
        raw_sections = data.get("sections")
        sections: List[PromptSection] = []
        if isinstance(raw_sections, list) and len(raw_sections) > 0:
            for s in raw_sections:
                if isinstance(s, dict) and (s.get("label") or s.get("id")):
                    s_id = str(s.get("id") or s.get("label", "section")).lower().replace(" ", "_")
                    s_label = str(s.get("label") or s_id.upper())
                    s_type = str(s.get("type") or "text")
                    sections.append(
                        PromptSection(
                            id=s_id,
                            label=s_label,
                            type=s_type,
                            content=s.get("content"),
                            items=s.get("items"),
                        )
                    )

        # If sections list is missing, empty, or incomplete (< 3), extract from markdown headers
        if len(sections) < 3:
            md_sections = self._parse_sections_from_markdown(optimized_prompt)
            if len(md_sections) > len(sections):
                sections = md_sections

        # Process required_attachments
        raw_attachments = data.get("required_attachments")
        attachments: List[RequiredAttachment] = []
        if isinstance(raw_attachments, list):
            for att in raw_attachments:
                if isinstance(att, dict) and att.get("name"):
                    attachments.append(
                        RequiredAttachment(
                            name=str(att.get("name")),
                            type=str(att.get("type", "document")),
                            description=str(att.get("description", "")),
                            required=bool(att.get("required", True)),
                            format_recommendation=att.get("format_recommendation"),
                        )
                    )

        data["sections"] = [s.model_dump() for s in sections]
        data["required_attachments"] = [a.model_dump() for a in attachments]

        try:
            return PromptGenerationResponse.model_validate(data)
        except ValidationError as exc:
            raise ParseError(f"Response failed schema validation: {exc}") from exc

    def _parse_sections_from_markdown(self, markdown_text: str) -> List[PromptSection]:
        """Auto-extract structured sections from markdown headers (### Header)."""
        pattern = re.compile(r"^(#{1,4})\s+(.+)$", re.MULTILINE)
        matches = list(pattern.finditer(markdown_text))
        if not matches:
            return [
                PromptSection(
                    id="optimized_prompt",
                    label="STRUCTURED PROMPT",
                    type="text",
                    content=markdown_text,
                )
            ]

        sections: List[PromptSection] = []
        for i, match in enumerate(matches):
            header_title = match.group(2).strip().upper()
            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(markdown_text)
            body = markdown_text[start_pos:end_pos].strip()

            sec_id = re.sub(r"[^a-z0-9_]", "", header_title.lower().replace(" ", "_")) or f"sec_{i+1}"

            # Check if body consists of bullet points or numbered lists
            lines = [line.strip() for line in body.split("\n") if line.strip()]
            is_bullet = bool(lines and all(l.startswith(("-", "*", "•")) for l in lines))
            is_numbered = bool(lines and all(re.match(r"^\d+[\.\)]", l) for l in lines))

            if is_bullet:
                clean_items = []
                for l in lines:
                    item_text = re.sub(r"^[-*•]\s*", "", l).strip()
                    if ":" in item_text and not item_text.startswith("http"):
                        k, v = item_text.split(":", 1)
                        clean_items.append({"key": k.strip(), "text": v.strip()})
                    else:
                        clean_items.append({"text": item_text})
                sections.append(
                    PromptSection(
                        id=sec_id,
                        label=header_title,
                        type="list",
                        items=clean_items,
                    )
                )
            elif is_numbered:
                clean_items = [
                    {"text": re.sub(r"^\d+[\.\)]\s*", "", l).strip()} for l in lines
                ]
                sections.append(
                    PromptSection(
                        id=sec_id,
                        label=header_title,
                        type="numbered",
                        items=clean_items,
                    )
                )
            else:
                sections.append(
                    PromptSection(
                        id=sec_id,
                        label=header_title,
                        type="text",
                        content=body,
                    )
                )

        return sections
