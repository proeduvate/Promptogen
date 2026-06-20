"""LLM client factory — returns the provider configured in LLM_PROVIDER."""

from typing import Union

from core.config import settings


def get_llm_client() -> Union["GroqClient", "OpenAIClient"]:  # noqa: F821
    """FastAPI dependency — returns the active LLM client based on LLM_PROVIDER.

    Switch providers by changing LLM_PROVIDER in .env:
        LLM_PROVIDER=groq    → GroqClient   (current)
        LLM_PROVIDER=openai  → OpenAIClient (future)
    """
    if settings.llm_provider == "groq":
        from clients.groq_client import GroqClient
        return GroqClient()

    from clients.openai_client import OpenAIClient
    return OpenAIClient()
