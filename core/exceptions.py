class PromptGenError(Exception):
    """Base exception for all PromptGen errors."""


class LLMError(PromptGenError):
    """Raised when the LLM call fails (network, timeout, API error)."""


class LLMTimeoutError(LLMError):
    """Raised when the LLM call exceeds the configured timeout."""


class ParseError(PromptGenError):
    """Raised when the LLM response cannot be parsed into the expected schema."""


class AssessmentError(PromptGenError):
    """Raised when the LLM's quality-assessment response can't be parsed or validated."""
