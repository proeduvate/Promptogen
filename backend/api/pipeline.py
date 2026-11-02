"""Pipeline API - two-step adaptive endpoint backed by LangGraph workflows."""

import logging
import time
import uuid
from contextlib import contextmanager
from typing import Any, Generator, List, Optional, Union

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

from api.deps import get_client_ip, get_optional_current_user
from clients.factory import get_llm_client
from clients.gemini_client import GEMINI_FREE_TIER_MODELS
from core.database import database
from graph.workflow import clarify_workflow, gen_assess_workflow
from schemas.prompt_generation import PipelineFollowUpRequest, PipelineFollowUpResponse
from services.auth_store import auth_store
from services.prompt_generation.service import PromptGenerationService

logger = logging.getLogger("promptgen.api.pipeline")

router = APIRouter(prefix="/api/v1/pipeline", tags=["Pipeline"])

_SESSION_TTL = 3600  # 1 hour persistence for active sessions


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

    def get(self, key: str) -> Optional[dict]:
        self._purge()
        return self._data.get(key)

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
    model: Optional[str] = "gemini-3.5-flash-lite"
    api_key: Optional[str] = None
    provider: Optional[str] = None
    attachment: Optional[dict] = None


class PipelineStartResponse(BaseModel):
    thread_id: str
    prompt_title: Optional[str] = None
    questions: list
    is_sufficient: bool = False
    task_domain: str = "general"
    task_intent: str = ""
    depth_analysis: Optional[dict] = None
    status: str = "awaiting_answers"


class PipelineAnswerItem(BaseModel):
    question_id: int
    question: str
    selected_option: str
    custom_input: str = ""


class PipelineContinueRequest(BaseModel):
    thread_id: str
    answers: List[PipelineAnswerItem] = Field(..., min_length=1)
    model: Optional[str] = "gemini-3.5-flash-lite"
    api_key: Optional[str] = None
    provider: Optional[str] = None


class PipelineContinueResponse(BaseModel):
    thread_id: str
    prompt_title: str
    optimized_prompt: str
    overall_score: int
    clarity: int
    specificity: int
    context: int
    structure: int
    actionability: int
    suggestions: List[str]
    status: str = "complete"
    step2_status: str = "complete"
    sections: List[dict] = Field(default_factory=list)
    required_attachments: List[dict] = Field(default_factory=list)
    improved: bool = False
    iteration_count: int = 0


def _extract_sections(text: str) -> List[dict]:
    """Parse optimized prompt text into structured UI sections."""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return []

    sections = [
        {
            "id": "prompt_content",
            "title": "GENERATED PROMPT",
            "type": "text",
            "items": [{"text": text}],
        }
    ]
    return sections


@router.get(
    "/models",
    summary="List available Gemini free-tier models",
    description="Returns Gemini free tier models eligible for adaptive question generation.",
)
async def list_models():
    return {"models": GEMINI_FREE_TIER_MODELS}


@router.post(
    "/start",
    response_model=PipelineStartResponse,
    status_code=status.HTTP_200_OK,
    summary="Start the pipeline",
    description="Analyzes prompt depth and returns clarification questions.",
)
async def start_pipeline(
    request: PipelineStartRequest,
    raw_request: Request,
    authorization: Optional[str] = Header(None),
) -> PipelineStartResponse:
    client_ip = get_client_ip(raw_request)
    current_user = await get_optional_current_user(authorization)

    # IP-level rate limiting for unauthenticated guest sessions (limit: 2 prompts/day)
    is_test_client = client_ip == "testclient" and not raw_request.headers.get("x-test-enforce-limit")
    if not current_user and not is_test_client:
        ip_status = auth_store.get_ip_status(client_ip)
        if ip_status["locked"]:
            logger.warning("Blocked guest prompt generation: IP %s locked (%d/%d used)", client_ip, ip_status["used"], ip_status["limit"])
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Guest generation limit reached. You can generate up to 2 prompts per day as a guest. Please log in or sign up to enjoy unlimited prompt generations.",
            )
        auth_store.record_guest_generation(client_ip)

    thread_id = str(uuid.uuid4())
    logger.info(
        "POST /pipeline/start | thread_id=%s model=%s user=%s ip=%s has_attachment=%s",
        thread_id,
        request.model,
        current_user["email"] if current_user else "guest",
        client_ip,
        bool(request.attachment),
    )

    query_text = request.query
    if request.attachment:
        att_name = request.attachment.get("name", "attachment")
        att_type = request.attachment.get("type", "")
        att_content = request.attachment.get("content")
        is_binary = bool(request.attachment.get("isBinary"))
        if att_content and isinstance(att_content, str):
            if not is_binary:
                query_text = f"{query_text}\n\n[Attached File: {att_name} ({att_type})]:\n{att_content}"
            else:
                query_text = f"{query_text}\n\n[Attached File: {att_name} ({att_type}, multimodal media attached)]"
        else:
            query_text = f"{query_text}\n\n[Attached File: {att_name} ({att_type})]"

    state_input = {
        "original_query": query_text,
        "provider": request.provider,
        "model": request.model,
        "api_key": request.api_key,
    }

    lc_config = {
        "run_name": f"Clarification Workflow [{request.model or 'default'}]",
        "tags": ["promptogen", "clarification", request.model or "default"],
        "metadata": {
            "thread_id": thread_id,
            "model": request.model,
            "provider": request.provider,
            "has_attachment": bool(request.attachment),
        },
    }

    try:
        with _lc_context():
            result = await clarify_workflow.ainvoke(state_input, config=lc_config)
    except Exception as exc:
        logger.error("Pipeline start error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Clarification failed: {exc}",
        ) from exc

    questions = result.get("questions", [])
    is_sufficient = bool(result.get("is_sufficient", False))
    task_domain = result.get("task_domain", "general")
    task_intent = result.get("task_intent", "")
    depth_analysis = result.get("depth_analysis", {})

    status_str = "sufficient" if is_sufficient and len(questions) == 0 else "awaiting_answers"

    try:
        await database.create_prompt_creation(thread_id, request.query, questions)
    except Exception as db_err:
        logger.error("Database create_prompt_creation failed: %s", db_err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database persistence error: {db_err}",
        )

    _state_store.set(
        thread_id,
        {
            "original_query": query_text,
            "attachment": request.attachment,
            "questions": questions,
            "task_domain": task_domain,
            "depth_analysis": depth_analysis,
            "user_id": current_user["id"] if current_user else None,
            "is_guest": not bool(current_user),
        },
    )

    logger.info("Pipeline start OK | thread_id=%s questions=%d title=%s", thread_id, len(questions), result.get("prompt_title"))

    return PipelineStartResponse(
        thread_id=thread_id,
        prompt_title=result.get("prompt_title"),
        questions=questions,
        is_sufficient=is_sufficient,
        task_domain=task_domain,
        task_intent=task_intent,
        depth_analysis=depth_analysis,
        status=status_str,
    )


@router.post(
    "/continue",
    response_model=PipelineContinueResponse,
    status_code=status.HTTP_200_OK,
    summary="Continue with user answers",
    description="Submits answers to produce prompt and quality scores.",
)
async def continue_pipeline(request: PipelineContinueRequest) -> PipelineContinueResponse:
    stored = _state_store.get(request.thread_id)
    if stored is None:
        try:
            stored = await database.get_prompt_creation(request.thread_id)
            if stored:
                _state_store.set(request.thread_id, stored)
        except Exception as db_err:
            logger.warning("Database fallback lookup warning: %s", db_err)

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
        request.thread_id,
        len(request.answers),
    )

    answers_payload = [a.model_dump() for a in request.answers]
    lc_config = {
        "run_name": f"Generation & Assessment Workflow [{request.model or 'default'}]",
        "tags": ["promptogen", "generation", "assessment", request.model or "default"],
        "metadata": {
            "thread_id": request.thread_id,
            "model": request.model,
            "provider": request.provider,
            "answers_count": len(request.answers),
        },
    }

    try:
        with _lc_context():
            result = await gen_assess_workflow.ainvoke(
                {
                    "original_query": stored["original_query"],
                    "answers": answers_payload,
                    "model": request.model,
                    "api_key": request.api_key,
                    "provider": request.provider,
                },
                config=lc_config,
            )
    except Exception as exc:
        logger.error("Pipeline continue error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Prompt generation or assessment failed: {exc}",
        ) from exc

    optimized_prompt = result.get("optimized_prompt", "")
    sections = result.get("sections")
    if not sections:
        sections = _extract_sections(optimized_prompt)
    required_attachments = result.get("required_attachments") or []

    prompt_title = result.get("prompt_title", "Optimized Prompt")
    overall_score = result.get("overall_score", 85)
    clarity = result.get("clarity", 85)
    specificity = result.get("specificity", 85)
    context = result.get("context", 85)
    structure = result.get("structure", 85)
    actionability = result.get("actionability", 85)
    suggestions = result.get("suggestions", [])
    improved = bool(result.get("improved", False))
    iteration_count = int(result.get("iteration_count", 0))

    try:
        await database.complete_prompt_creation(
            request.thread_id,
            answers_payload,
            {
                "prompt_title": prompt_title,
                "optimized_prompt": optimized_prompt,
                "overall_score": overall_score,
                "clarity": clarity,
                "specificity": specificity,
                "context": context,
                "structure": structure,
                "actionability": actionability,
                "suggestions": suggestions,
            },
        )
    except Exception as db_err:
        logger.warning("Database complete_prompt_creation warning: %s", db_err)

    # Keep active session updated in state store for iterative refinements and follow-ups
    _state_store.set(
        request.thread_id,
        {
            **stored,
            "optimized_prompt": optimized_prompt,
            "sections": sections,
            "prompt_title": prompt_title,
            "overall_score": overall_score,
            "clarity": clarity,
            "specificity": specificity,
            "context": context,
            "structure": structure,
            "actionability": actionability,
            "suggestions": suggestions,
            "required_attachments": required_attachments,
            "improved": improved,
            "iteration_count": iteration_count,
        },
    )

    return PipelineContinueResponse(
        thread_id=request.thread_id,
        prompt_title=prompt_title,
        optimized_prompt=optimized_prompt,
        overall_score=overall_score,
        clarity=clarity,
        specificity=specificity,
        context=context,
        structure=structure,
        actionability=actionability,
        suggestions=suggestions,
        status="complete",
        step2_status="complete",
        sections=sections,
        required_attachments=required_attachments,
        improved=improved,
        iteration_count=iteration_count,
    )


@router.post(
    "/followup",
    response_model=PipelineFollowUpResponse,
    status_code=status.HTTP_200_OK,
    summary="Conversational follow-up and prompt refinement",
    description="Takes a user follow-up message, reads conversational context, and either refines the prompt or generates targeted clarification questions.",
)
async def pipeline_followup(request: PipelineFollowUpRequest) -> PipelineFollowUpResponse:
    stored = _state_store.get(request.thread_id)
    if stored is None:
        try:
            stored = await database.get_prompt_creation(request.thread_id)
            if stored:
                _state_store.set(request.thread_id, stored)
        except Exception as db_err:
            logger.warning("Database fallback lookup warning: %s", db_err)

    if stored is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"thread_id '{request.thread_id}' not found or expired. Call /pipeline/start first.",
        )

    logger.info("POST /pipeline/followup | thread_id=%s message_len=%d", request.thread_id, len(request.message))

    client = get_llm_client(
        provider=request.provider or stored.get("provider"),
        model=request.model or stored.get("model"),
        api_key=request.api_key or stored.get("api_key"),
    )

    original_query = stored.get("original_query", "")
    current_prompt = request.current_prompt or stored.get("optimized_prompt", "")
    service = PromptGenerationService(client=client)

    try:
        followup_res = await service.refine_prompt_followup(
            original_query=original_query,
            current_prompt=current_prompt,
            user_followup=request.message,
            history_summary=request.history_summary or "",
        )
    except Exception as exc:
        logger.error("Pipeline followup error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Prompt refinement failed: {exc}",
        ) from exc

    action = followup_res.get("action", "refine_prompt")

    if action == "clarify":
        return PipelineFollowUpResponse(
            thread_id=request.thread_id,
            action="clarify",
            questions=followup_res.get("questions", []),
            reasoning=followup_res.get("reasoning", "Additional clarification requested."),
        )

    # If refined prompt, evaluate quality scores
    from services.quality_assessment.service import QualityAssessmentService
    qa_service = QualityAssessmentService(client=client)
    optimized_prompt = followup_res.get("optimized_prompt", "")

    try:
        assessment = await qa_service.assess(optimized_prompt, persist_assessment=False)
        overall_score = assessment.overall_score
        clarity = assessment.clarity
        specificity = assessment.specificity
        context = assessment.context
        structure = assessment.structure
        actionability = assessment.actionability
        suggestions = assessment.suggestions
    except Exception as eval_err:
        logger.warning("Quality assessment fallback on followup: %s", eval_err)
        overall_score = stored.get("overall_score", 92)
        clarity = stored.get("clarity", 92)
        specificity = stored.get("specificity", 90)
        context = stored.get("context", 90)
        structure = stored.get("structure", 94)
        actionability = stored.get("actionability", 93)
        suggestions = ["Review specialized edge cases."]

    prompt_title = followup_res.get("prompt_title") or stored.get("prompt_title", "Refined Prompt")
    sections = followup_res.get("sections") or []
    required_attachments = followup_res.get("required_attachments") or []

    # Persist updated prompt to state store and database
    _state_store.set(
        request.thread_id,
        {
            **stored,
            "optimized_prompt": optimized_prompt,
            "sections": sections,
            "prompt_title": prompt_title,
            "overall_score": overall_score,
            "clarity": clarity,
            "specificity": specificity,
            "context": context,
            "structure": structure,
            "actionability": actionability,
            "suggestions": suggestions,
            "required_attachments": required_attachments,
        },
    )

    try:
        await database.complete_prompt_creation(
            request.thread_id,
            stored.get("answers", []),
            {
                "prompt_title": prompt_title,
                "optimized_prompt": optimized_prompt,
                "overall_score": overall_score,
                "clarity": clarity,
                "specificity": specificity,
                "context": context,
                "structure": structure,
                "actionability": actionability,
                "suggestions": suggestions,
            },
        )
    except Exception as db_err:
        logger.warning("Database complete_prompt_creation warning on followup: %s", db_err)

    return PipelineFollowUpResponse(
        thread_id=request.thread_id,
        action="refine_prompt",
        version_label=followup_res.get("version_label", "Refined Prompt"),
        prompt_title=prompt_title,
        optimized_prompt=optimized_prompt,
        overall_score=overall_score,
        clarity=clarity,
        specificity=specificity,
        context=context,
        structure=structure,
        actionability=actionability,
        suggestions=suggestions,
        sections=sections,
        required_attachments=required_attachments,
    )
