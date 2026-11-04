"""Multi-provider LLM models catalog & dynamic availability resolver."""

from typing import Any, Dict, List
from core.config import settings

# ── Master Catalog of Supported LLM Models across Providers ───────────────────
MODELS_CATALOG: List[Dict[str, Any]] = [
    # ── Google Gemini Models ──────────────────────────────────────────────────
    {
        "id": "gemini-3.5-flash-lite",
        "name": "Gemini 3.5 Flash-Lite",
        "label": "Gemini 3.5 Flash-Lite",
        "provider": "gemini",
        "provider_label": "Google Gemini",
        "badge": "Recommended (Free Tier)",
        "description": "Ultra low-latency multimodal reasoning with high active throughput on Google free tier",
        "free_tier": True,
        "recommended": True,
        "limits": "15 RPM / 1M TPM / 1,500 RPD",
    },
    {
        "id": "gemini-flash-lite-latest",
        "name": "Gemini Flash-Lite Latest",
        "label": "Gemini Flash-Lite Latest",
        "provider": "gemini",
        "provider_label": "Google Gemini",
        "badge": "High Throughput",
        "description": "Cost-efficient, high-throughput extraction and classification on Google infrastructure",
        "free_tier": True,
        "recommended": False,
        "limits": "30 RPM / 1M TPM / 1,500 RPD",
    },
    {
        "id": "gemini-3-flash-preview",
        "name": "Gemini 3 Flash Preview",
        "label": "Gemini 3 Flash Preview",
        "provider": "gemini",
        "provider_label": "Google Gemini",
        "badge": "Next-Gen Reasoning",
        "description": "Next-generation multimodal reasoning and complex structured prompt synthesis",
        "free_tier": True,
        "recommended": False,
        "limits": "15 RPM / 1M TPM / 1,500 RPD",
    },
    {
        "id": "gemini-3.8-flash",
        "name": "Gemini 3.8 Flash",
        "label": "Gemini 3.8 Flash",
        "provider": "gemini",
        "provider_label": "Google Gemini",
        "badge": "Flagship Multimodal",
        "description": "Google's latest flagship high-speed architecture with advanced analytical depth",
        "free_tier": True,
        "recommended": False,
        "limits": "15 RPM / 1M TPM / 1,500 RPD",
    },
    # Backward compatibility aliases (automatically routed to active endpoints)
    {
        "id": "gemini-2.5-flash",
        "name": "Gemini 2.5 Flash",
        "label": "Gemini 2.5 Flash (Compatibility)",
        "provider": "gemini",
        "provider_label": "Google Gemini",
        "badge": "Routed to 3.5 Flash-Lite",
        "description": "Legacy alias routed automatically to active Gemini 3.5 Flash-Lite",
        "free_tier": True,
        "recommended": False,
    },
    {
        "id": "gemini-1.5-flash",
        "name": "Gemini 1.5 Flash",
        "label": "Gemini 1.5 Flash (Compatibility)",
        "provider": "gemini",
        "provider_label": "Google Gemini",
        "badge": "Routed to 3.5 Flash-Lite",
        "description": "Legacy alias routed automatically to active Gemini 3.5 Flash-Lite",
        "free_tier": True,
        "recommended": False,
    },

    # ── Groq Models ───────────────────────────────────────────────────────────
    {
        "id": "llama-3.3-70b-versatile",
        "name": "Llama 3.3 70B",
        "label": "Llama 3.3 70B (Groq)",
        "provider": "groq",
        "provider_label": "Groq",
        "badge": "300+ Tokens/Sec",
        "description": "Meta's flagship open model running on Groq LPUs at 300+ tokens/second",
        "free_tier": False,
        "recommended": False,
        "limits": "30 RPM / 6K TPM",
    },
    {
        "id": "llama-3.1-8b-instant",
        "name": "Llama 3.1 8B Instant",
        "label": "Llama 3.1 8B (Groq)",
        "provider": "groq",
        "provider_label": "Groq",
        "badge": "Instant Latency",
        "description": "Sub-second response times for rapid question generation and refinement",
        "free_tier": False,
        "recommended": False,
        "limits": "30 RPM / 20K TPM",
    },
    {
        "id": "mixtral-8x7b-32768",
        "name": "Mixtral 8x7B",
        "label": "Mixtral 8x7B (Groq)",
        "provider": "groq",
        "provider_label": "Groq",
        "badge": "MoE Architecture",
        "description": "Mixture-of-Experts with 32k context for diverse domain engineering",
        "free_tier": False,
        "recommended": False,
        "limits": "30 RPM / 5K TPM",
    },
    {
        "id": "gemma2-9b-it",
        "name": "Gemma 2 9B",
        "label": "Gemma 2 9B (Groq)",
        "provider": "groq",
        "provider_label": "Groq",
        "badge": "Google Open",
        "description": "Google's instruction-tuned open weights optimized on Groq hardware",
        "free_tier": False,
        "recommended": False,
        "limits": "30 RPM / 15K TPM",
    },

    # ── OpenAI Models ─────────────────────────────────────────────────────────
    {
        "id": "gpt-4o",
        "name": "GPT-4o",
        "label": "GPT-4o (OpenAI)",
        "provider": "openai",
        "provider_label": "OpenAI",
        "badge": "Flagship Multimodal",
        "description": "OpenAI's high-intelligence flagship model across text, logic, and multimodal reasoning",
        "free_tier": False,
        "recommended": False,
    },
    {
        "id": "gpt-4o-mini",
        "name": "GPT-4o Mini",
        "label": "GPT-4o Mini (OpenAI)",
        "provider": "openai",
        "provider_label": "OpenAI",
        "badge": "Fast & Efficient",
        "description": "Affordable, lightweight model optimized for high-volume structured outputs",
        "free_tier": False,
        "recommended": False,
    },
    {
        "id": "o1-mini",
        "name": "o1-mini",
        "label": "o1-mini (OpenAI)",
        "provider": "openai",
        "provider_label": "OpenAI",
        "badge": "Math & Code Reasoning",
        "description": "Chain-of-thought reasoning model specialized for coding, math, and stem tasks",
        "free_tier": False,
        "recommended": False,
    },

    # ── Anthropic Claude Models ───────────────────────────────────────────────
    {
        "id": "claude-3-5-sonnet-20241022",
        "name": "Claude 3.5 Sonnet",
        "label": "Claude 3.5 Sonnet (Anthropic)",
        "provider": "anthropic",
        "provider_label": "Anthropic",
        "badge": "Gold Standard Prompting",
        "description": "Industry benchmark for complex prompt engineering, nuanced style, and coding",
        "free_tier": False,
        "recommended": False,
    },
    {
        "id": "claude-3-5-haiku-20241022",
        "name": "Claude 3.5 Haiku",
        "label": "Claude 3.5 Haiku (Anthropic)",
        "provider": "anthropic",
        "provider_label": "Anthropic",
        "badge": "Fast & Nuanced",
        "description": "Next-generation high-speed Claude model with exceptional instruction following",
        "free_tier": False,
        "recommended": False,
    },
]


def get_available_models() -> List[Dict[str, Any]]:
    """Returns only the models whose provider boolean is enabled in settings."""
    enabled_providers = set()
    if settings.enable_gemini:
        enabled_providers.add("gemini")
    if settings.enable_groq:
        enabled_providers.add("groq")
    if settings.enable_openai:
        enabled_providers.add("openai")
    if settings.enable_anthropic:
        enabled_providers.add("anthropic")

    # If all provider flags are false, fallback to Gemini
    if not enabled_providers:
        enabled_providers.add("gemini")

    available: List[Dict[str, Any]] = []
    for model in MODELS_CATALOG:
        prov = model["provider"]
        if prov in enabled_providers:
            item = dict(model)
            # Indicate whether server has token or client must provide token
            if prov == "gemini":
                item["has_server_key"] = settings.is_gemini_enabled
            elif prov == "groq":
                item["has_server_key"] = settings.is_groq_enabled
            elif prov == "openai":
                item["has_server_key"] = settings.is_openai_enabled
            elif prov == "anthropic":
                item["has_server_key"] = settings.is_anthropic_enabled
            else:
                item["has_server_key"] = False
            available.append(item)

    return available


def get_provider_status() -> Dict[str, Dict[str, Any]]:
    """Returns status and accessibility for each configured provider."""
    return {
        "gemini": {
            "enabled": settings.enable_gemini,
            "has_token": settings.is_gemini_enabled,
            "label": "Google Gemini",
            "default_model": settings.gemini_model,
        },
        "groq": {
            "enabled": settings.enable_groq,
            "has_token": settings.is_groq_enabled,
            "label": "Groq",
            "default_model": settings.groq_model,
        },
        "openai": {
            "enabled": settings.enable_openai,
            "has_token": settings.is_openai_enabled,
            "label": "OpenAI",
            "default_model": settings.openai_model,
        },
        "anthropic": {
            "enabled": settings.enable_anthropic,
            "has_token": settings.is_anthropic_enabled,
            "label": "Anthropic Claude",
            "default_model": settings.anthropic_model,
        },
    }
