from dotenv import load_dotenv
load_dotenv()

import os

print("Tracing:", os.getenv("LANGCHAIN_TRACING_V2"))
print("Project:", os.getenv("LANGCHAIN_PROJECT"))
print("API Key:", bool(os.getenv("LANGCHAIN_API_KEY")))
from fastapi import FastAPI

from api.clarification import router as clarification_router
from core.config import settings
from core.database import database
from core.logger import logger

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered webhook service that converts vague queries into high-quality prompts.",
)

# ── CORS Middleware ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"^https?://((localhost|127\.0\.0\.1|0\.0\.0\.0)(:[0-9]+)?|.*\.vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
# Authentication & Rate Limiting
from api.auth import router as auth_router
app.include_router(auth_router)

# Static Content & UI Metadata
from api.content import router as content_router
app.include_router(content_router)

# Prompt Library & Saved Prompts
from api.library import router as library_router
app.include_router(library_router)

# Developer 1 — Clarification
app.include_router(clarification_router)

# Developer 2 — Prompt Generation
from api.prompt_generation import router as prompt_generation_router
app.include_router(prompt_generation_router)

# Developer 3 — Quality Assessment
from api.quality_assessment import router as quality_assessment_router
app.include_router(quality_assessment_router)

# LangGraph Pipeline
from api.pipeline import router as pipeline_router
app.include_router(pipeline_router)

# Analytics Dashboard
from api.analytics import router as analytics_router
app.include_router(analytics_router)


# ── Models route ─────────────────────────────────────────────────────────────
@app.get("/api/v1/models", tags=["Models"])
async def get_models():
    from clients.gemini_client import GEMINI_FREE_TIER_MODELS
    return {"models": GEMINI_FREE_TIER_MODELS}


# ── Root & Health endpoints ───────────────────────────────────────────────────
@app.get("/", tags=["Health"])
@app.get("/api", tags=["Health"])
@app.get("/api/v1", tags=["Health"])
async def root() -> dict:
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}


# ── Startup log ────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup() -> None:
    try:
        await database.connect()
    except Exception as exc:
        logger.warning("Database connection failed on startup: %s. Continuing in in-memory mode.", exc)
    logger.info("%s v%s started", settings.app_name, settings.app_version)
    logger.info("Swagger UI → http://localhost:8000/docs")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    try:
        await database.close()
    except Exception as exc:
        logger.warning("Database disconnection error on shutdown: %s", exc)
