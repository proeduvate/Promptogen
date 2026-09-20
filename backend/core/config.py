from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Provider selector ────────────────────────────────────────────────────
    llm_provider: Literal["groq", "openai"] = Field(default="groq", alias="LLM_PROVIDER")

    # ── Groq ─────────────────────────────────────────────────────────────────
    groq_api_key: str = Field(default="gsk-placeholder", alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_MODEL")

    # ── OpenAI (for future use) ───────────────────────────────────────────────
    openai_api_key: str = Field(default="sk-placeholder", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")

    # ── LLM behaviour (shared across providers) ───────────────────────────────
    llm_timeout: float = Field(default=30.0, alias="LLM_TIMEOUT")
    llm_temperature: float = Field(default=0.7, alias="LLM_TEMPERATURE")
    llm_max_tokens: int = Field(default=2048, alias="LLM_MAX_TOKENS")

    # ── LangSmith (optional — set to enable tracing & token tracking) ────────
    langchain_tracing_v2: str = Field(default="false", alias="LANGCHAIN_TRACING_V2")
    langchain_api_key: str = Field(default="", alias="LANGCHAIN_API_KEY")
    langchain_project: str = Field(default="promptgen-clarification", alias="LANGCHAIN_PROJECT")

    # ── App ───────────────────────────────────────────────────────────────────
    app_name: str = "PromptGen AI Service"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, alias="DEBUG")


settings = Settings()
