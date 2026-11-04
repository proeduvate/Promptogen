from typing import Literal, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── LLM Provider Enablement Flags ────────────────────────────────────────
    enable_gemini: bool = Field(default=True, alias="ENABLE_GEMINI")
    enable_groq: bool = Field(default=False, alias="ENABLE_GROQ")
    enable_openai: bool = Field(default=False, alias="ENABLE_OPENAI")
    enable_anthropic: bool = Field(default=False, alias="ENABLE_ANTHROPIC")

    # ── Primary Provider Selector ────────────────────────────────────────────
    llm_provider: str = Field(default="gemini", alias="LLM_PROVIDER")

    # ── Google Gemini ────────────────────────────────────────────────────────
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-3.5-flash-lite", alias="GEMINI_MODEL")

    # ── Groq ─────────────────────────────────────────────────────────────────
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_MODEL")

    # ── OpenAI ───────────────────────────────────────────────────────────────
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")

    # ── Anthropic Claude ─────────────────────────────────────────────────────
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(default="claude-3-5-sonnet-20241022", alias="ANTHROPIC_MODEL")

    # ── LLM behaviour (shared across providers) ──────────────────────────────
    llm_timeout: float = Field(default=45.0, alias="LLM_TIMEOUT")
    llm_temperature: float = Field(default=0.7, alias="LLM_TEMPERATURE")
    llm_max_tokens: int = Field(default=8192, alias="LLM_MAX_TOKENS")

    # ── LangSmith Tracing & Observability ────────────────────────────────────
    langchain_tracing_v2: str = Field(default="false", alias="LANGCHAIN_TRACING_V2")
    langchain_api_key: str = Field(default="", alias="LANGCHAIN_API_KEY")
    langchain_project: str = Field(default="promptogen", alias="LANGCHAIN_PROJECT")
    langchain_endpoint: str = Field(default="https://api.smith.langchain.com", alias="LANGCHAIN_ENDPOINT")

    # ── Database (optional — set DATABASE_URL to enable PostgreSQL persistence) ─
    database_url: str = Field(default="", alias="DATABASE_URL")

    # ── Auth & Rate Limiting ──────────────────────────────────────────────────
    jwt_secret_key: str = Field(
        default="promptogen-super-secure-jwt-secret-key-32bytes-auth-2026",
        alias="JWT_SECRET_KEY",
    )
    jwt_expire_days: int = Field(default=30, alias="JWT_EXPIRE_DAYS")
    guest_daily_limit: int = Field(default=2, alias="GUEST_DAILY_LIMIT")
    google_client_id: str = Field(default="", alias="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(default="", alias="GOOGLE_CLIENT_SECRET")

    # ── App & CORS ────────────────────────────────────────────────────────────
    app_name: str = "PromptoGen AI Service"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, alias="DEBUG")
    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
        alias="CORS_ORIGINS",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_gemini_enabled(self) -> bool:
        return bool(self.enable_gemini and self.gemini_api_key and not self.gemini_api_key.startswith("your_"))

    @property
    def is_groq_enabled(self) -> bool:
        return bool(self.enable_groq and self.groq_api_key and not self.groq_api_key.startswith("your_") and not self.groq_api_key.startswith("gsk-placeholder"))

    @property
    def is_openai_enabled(self) -> bool:
        return bool(self.enable_openai and self.openai_api_key and not self.openai_api_key.startswith("your_") and not self.openai_api_key.startswith("sk-placeholder"))

    @property
    def is_anthropic_enabled(self) -> bool:
        return bool(self.enable_anthropic and self.anthropic_api_key and not self.anthropic_api_key.startswith("your_") and not self.anthropic_api_key.startswith("sk-ant-placeholder"))


settings = Settings()
