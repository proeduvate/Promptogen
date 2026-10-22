from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Provider selector ────────────────────────────────────────────────────
    llm_provider: Literal["gemini", "groq", "openai"] = Field(default="gemini", alias="LLM_PROVIDER")

    # ── Gemini ───────────────────────────────────────────────────────────────
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-3.5-flash-lite", alias="GEMINI_MODEL")

    # ── Groq ─────────────────────────────────────────────────────────────────
    groq_api_key: str = Field(default="gsk-placeholder", alias="GROQ_API_KEY")
    groq_model: str = Field(default="qwen/qwen3.8-27b", alias="GROQ_MODEL")

    # ── OpenAI (for future use) ───────────────────────────────────────────────
    openai_api_key: str = Field(default="sk-placeholder", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")

    # ── LLM behaviour (shared across providers) ───────────────────────────────
    llm_timeout: float = Field(default=45.0, alias="LLM_TIMEOUT")
    llm_temperature: float = Field(default=0.7, alias="LLM_TEMPERATURE")
    llm_max_tokens: int = Field(default=8192, alias="LLM_MAX_TOKENS")

    # ── LangSmith (optional — set to enable tracing & token tracking) ────────
    langchain_tracing_v2: str = Field(default="false", alias="LANGCHAIN_TRACING_V2")
    langchain_api_key: str = Field(default="", alias="LANGCHAIN_API_KEY")
    langchain_project: str = Field(default="promptgen-clarification", alias="LANGCHAIN_PROJECT")

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


settings = Settings()
