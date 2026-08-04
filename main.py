from dotenv import load_dotenv
load_dotenv()

import os

print("Tracing:", os.getenv("LANGCHAIN_TRACING_V2"))
print("Project:", os.getenv("LANGCHAIN_PROJECT"))
print("API Key:", bool(os.getenv("LANGCHAIN_API_KEY")))
from fastapi import FastAPI

from api.clarification import router as clarification_router
from core.config import settings
from core.logger import logger

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered webhook service that converts vague queries into high-quality prompts.",
)

# ── Routers ────────────────────────────────────────────────────────────────────
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


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}


# ── Startup log ────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup() -> None:
    logger.info("%s v%s started", settings.app_name, settings.app_version)
    logger.info("Swagger UI → http://localhost:8000/docs")
