"""LangGraph node functions — one per pipeline stage."""

import logging

from clients.groq_client import GroqClient
from graph.state import PromptGenState
from schemas.prompt_generation import AnsweredQuestion, PromptGenerationRequest
from services.clarification.service import ClarificationService
from services.prompt_generation.service import PromptGenerationService
from services.quality_assessment.service import QualityAssessmentService

logger = logging.getLogger("promptgen.graph.nodes")


async def clarify_node(state: PromptGenState) -> dict:
    logger.info("[graph] clarify_node | query_length=%d", len(state["original_query"]))
    client = GroqClient()
    service = ClarificationService(client=client)
    response = await service.generate_questions(state["original_query"])
    questions = [q.model_dump() for q in response.questions]
    logger.info("[graph] clarify_node done | questions=%d", len(questions))
    return {"questions": questions}


async def generate_node(state: PromptGenState) -> dict:
    logger.info("[graph] generate_node | answers=%d", len(state["answers"]))
    client = GroqClient()
    service = PromptGenerationService(client=client)
    request = PromptGenerationRequest(
        original_query=state["original_query"],
        answers=[AnsweredQuestion(**a) for a in state["answers"]],
    )
    response = await service.generate_prompt(request)
    logger.info("[graph] generate_node done | title=%r", response.title)
    return {"prompt_title": response.title, "optimized_prompt": response.optimized_prompt}


async def assess_node(state: PromptGenState) -> dict:
    logger.info("[graph] assess_node | prompt_length=%d", len(state["optimized_prompt"]))
    client = GroqClient()
    service = QualityAssessmentService(client=client)
    response = await service.assess(state["optimized_prompt"])
    logger.info(
        "[graph] assess_node done | overall=%d clarity=%d specificity=%d",
        response.overall_score, response.clarity, response.specificity,
    )
    return {
        "overall_score": response.overall_score,
        "clarity": response.clarity,
        "specificity": response.specificity,
        "suggestions": response.suggestions,
    }
