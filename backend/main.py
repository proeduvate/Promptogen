from dotenv import load_dotenv
load_dotenv()

import os

print("Tracing:", os.getenv("LANGCHAIN_TRACING_V2"))
print("Project:", os.getenv("LANGCHAIN_PROJECT"))
print("API Key:", bool(os.getenv("LANGCHAIN_API_KEY")))
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = ".".join(str(loc) for loc in err.get("loc", []) if loc != "body")
        msg = err.get("msg", "Invalid value")
        errors.append(f"{field}: {msg}" if field else msg)
    error_message = "; ".join(errors)
    logger.warning("Request validation error on %s %s: %s", request.method, request.url.path, error_message)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": error_message, "errors": exc.errors()},
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
    from clients.models_catalog import get_available_models, get_provider_status
    return {
        "models": get_available_models(),
        "providers": get_provider_status(),
    }


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
    # 1. Initialize LangSmith Observability & Tracing if configured
    from clients.tracing import setup_langsmith_environment
    setup_langsmith_environment()

    # 2. Connect to database
    logger.info("Connecting to database...")
    try:
        await database.connect()
    except Exception as exc:
        logger.critical("FATAL: Database connection failed on startup: %s. Aborting startup.", exc)
        raise RuntimeError(f"Database connection failed on startup: {exc}") from exc

    import os
    import sys
    is_test_env = "pytest" in sys.modules or os.getenv("TESTING") == "true"
    if not is_test_env and not database.is_connected:
        logger.critical("FATAL: Database is not connected. Aborting startup.")
        raise RuntimeError("Database is not connected. Service startup aborted.")

    logger.info("%s v%s started with active database connection", settings.app_name, settings.app_version)
    logger.info("Swagger UI → http://localhost:8000/docs")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    try:
        await database.close()
    except Exception as exc:
        logger.warning("Database disconnection error on shutdown: %s", exc)
