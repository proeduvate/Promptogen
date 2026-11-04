"""LLM client factory — returns active client based on provider or explicit arguments."""

from typing import Optional, Union

from core.config import settings


def get_llm_client(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Union["GeminiClient", "GroqClient", "OpenAIClient", "AnthropicClient"]:  # noqa: F821
    """Returns the LLM client instance based on configured provider or overrides."""
    prov = (provider or settings.llm_provider).lower()
    model_str = (model or "").lower()

    # Determine provider by model name or explicit provider
    if "claude" in model_str or prov in ("anthropic", "claude"):
        from clients.anthropic_client import AnthropicClient
        return AnthropicClient(api_key=api_key, model=model)

    if "gemini" in model_str or prov == "gemini":
        from clients.gemini_client import GeminiClient
        return GeminiClient(api_key=api_key, model=model)

    if any(k in model_str for k in ["llama", "mixtral", "gemma", "qwen"]) or prov == "groq":
        from clients.groq_client import GroqClient
        return GroqClient(api_key=api_key, model=model)

    if any(k in model_str for k in ["gpt", "o1", "o3", "davinci"]) or prov == "openai":
        from clients.openai_client import OpenAIClient
        return OpenAIClient(api_key=api_key, model=model)

    # Fallback to configured active provider or Gemini
    if settings.is_gemini_enabled:
        from clients.gemini_client import GeminiClient
        return GeminiClient(api_key=api_key, model=model)
    elif settings.is_groq_enabled:
        from clients.groq_client import GroqClient
        return GroqClient(api_key=api_key, model=model)
    elif settings.is_openai_enabled:
        from clients.openai_client import OpenAIClient
        return OpenAIClient(api_key=api_key, model=model)
    elif settings.is_anthropic_enabled:
        from clients.anthropic_client import AnthropicClient
        return AnthropicClient(api_key=api_key, model=model)

    from clients.gemini_client import GeminiClient
    return GeminiClient(api_key=api_key, model=model)


def get_langchain_model(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
    timeout: Optional[float] = None,
):
    """Returns a PromptogenChatModel wrapping the exact user-selected model.
    
    Guarantees strict model preservation: the model parameter is never auto-switched.
    """
    from clients.langchain_adapter import PromptogenChatModel

    # Preserve user selected model strictly; fallback to configured default only if None
    target_model = model or getattr(settings, "gemini_model", "gemini-3.5-flash-lite")

    return PromptogenChatModel(
        model_name=target_model,
        provider=provider,
        api_key=api_key,
        temperature=temperature,
        max_tokens=max_tokens,
        timeout=timeout,
    )

