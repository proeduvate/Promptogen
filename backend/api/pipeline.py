"""Pipeline API - two-step endpoint backed by two LangGraph workflows."""

import logging
import time
import uuid
from contextlib import contextmanager
from typing import Generator, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from graph.workflow import clarify_workflow, gen_assess_workflow

logger = logging.getLogger("promptgen.api.pipeline")

router = APIRouter(prefix="/api/v1/pipeline", tags=["Pipeline"])

_SESSION_TTL = 600  # 10 minutes


class _TTLStore:
    """In-memory store with automatic expiry of stale sessions."""

    def __init__(self, ttl: int = _SESSION_TTL) -> None:
        self._ttl = ttl
        self._data: dict = {}
        self._ts: dict = {}

    def set(self, key: str, value: dict) -> None:
        self._purge()
        self._data[key] = value
        self._ts[key] = time.monotonic()

    def pop(self, key: str) -> Optional[dict]:
        self._purge()
        self._ts.pop(key, None)
        return self._data.pop(key, None)

    def _purge(self) -> None:
        now = time.monotonic()
        expired = [k for k, ts in self._ts.items() if now - ts > self._ttl]
        for k in expired:
            self._data.pop(k, None)
            self._ts.pop(k, None)
        if expired:
            logger.info("TTLStore purged %d expired session(s)", len(expired))


_state_store = _TTLStore()


@contextmanager
def _lc_context() -> Generator[None, None, None]:
    try:
        from langchain_core.runnables.config import var_child_runnable_config
        token = var_child_runnable_config.set(
            {"callbacks": [], "tags": [], "metadata": {}, "recursion_limit": 25, "configurable": {}}
        )
        try:
            yield
        finally:
            var_child_runnable_config.reset(token)
    except (ImportError, AttributeError):
        yield


class PipelineStartRequest(BaseModel):
    query: str = Field(..., min_length=1)


class PipelineStartResponse(BaseModel):
    thread_id: str
    questions: list
    status: str = "awaiting_answers"


class PipelineAnswerItem(BaseModel):
    question_id: int
    question: str
    selected_option: str
    custom_input: str = ""


class PipelineContinueRequest(BaseModel):
    thread_id: str
    answers: List[PipelineAnswerItem] = Field(..., min_length=1)


class PipelineContinueResponse(BaseModel):
    thread_id: str
    prompt_title: str
    optimized_prompt: str
    overall_score: int
    clarity: int
    specificity: int
    suggestions: List[str]
    status: str = "complete"


@router.post(
    "/start",
    response_model=PipelineStartResponse,
    status_code=status.HTTP_200_OK,
    summary="Start the pipeline",
    description="Submit a vague query. Returns a thread_id and clarification questions.",
)
async def start_pipeline(request: PipelineStartRequest) -> PipelineStartResponse:
    thread_id = str(uuid.uuid4())
    logger.info("POST /pipeline/start | thread_id=%s", thread_id)
    try:
        with _lc_context():
            result = await clarify_workflow.ainvoke({"original_query": request.query})
    except Exception as exc:
        logger.error("Pipeline start error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Clarification failed: {exc}",
        ) from exc

    questions = result.get("questions", [])
    _state_store.set(thread_id, {"original_query": request.query, "questions": questions})
    logger.info("Pipeline start OK | thread_id=%s questions=%d", thread_id, len(questions))
    return PipelineStartResponse(thread_id=thread_id, questions=questions, status="awaiting_answers")


@router.post(
    "/continue",
    response_model=PipelineContinueResponse,
    status_code=status.HTTP_200_OK,
    summary="Continue with user answers",
    description="Provide answers to the clarification questions. Returns the optimized prompt and quality scores.",
)
async def continue_pipeline(request: PipelineContinueRequest) -> PipelineContinueResponse:
    stored = _state_store.pop(request.thread_id)
    if stored is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"thread_id '{request.thread_id}' not found or expired. Call /pipeline/start first.",
        )

    # Validate that submitted answer question_ids match the stored question ids
    stored_ids = {q["id"] for q in stored["questions"]}
    submitted_ids = {a.question_id for a in request.answers}
    if stored_ids and submitted_ids != stored_ids:
        missing = stored_ids - submitted_ids
        extra = submitted_ids - stored_ids
        detail_parts = []
        if missing:
            detail_parts.append(f"missing question_ids: {sorted(missing)}")
        if extra:
            detail_parts.append(f"unexpected question_ids: {sorted(extra)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Answer validation failed - {'; '.join(detail_parts)}.",
        )

    logger.info(
        "POST /pipeline/continue | thread_id=%s answers=%d",
        request.thread_id, len(request.answers),
    )
    answers_payload = [a.model_dump() for a in request.answers]
    try:
        with _lc_context():
            result = await gen_assess_workflow.ainvoke(
                {"original_query": stored["original_query"], "answers": answers_payload}
            )
    except Exception as exc:
        logger.error("Pipeline continue error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Generation/assessment failed: {exc}",
        ) from exc

    logger.info(
        "Pipeline complete | thread_id=%s overall_score=%s",
        request.thread_id, result.get("overall_score"),
    )
    return PipelineContinueResponse(
        thread_id=request.thread_id,
        prompt_title=result.get("prompt_title", ""),
        optimized_prompt=result.get("optimized_prompt", ""),
        overall_score=result.get("overall_score", 0),
        clarity=result.get("clarity", 0),
        specificity=result.get("specificity", 0),
        suggestions=result.get("suggestions", []),
        status="complete",
    )
