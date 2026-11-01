"""Two LangGraph pipelines with self-improvement cycle:

Graph 1 — clarify_workflow:    START → clarify → END
Graph 2 — gen_assess_workflow: START → generate → assess → [conditional]
                                               ↑           ↓ (score < 85 & iteration < 1)
                                               └── improve ┘
                                                           ↓ (score >= 85 or iteration >= 1)
                                                          END
"""

import logging
from langgraph.graph import END, START, StateGraph

from graph.nodes import assess_node, clarify_node, generate_node, improve_node
from graph.state import PromptGenState

logger = logging.getLogger("promptgen.graph.workflow")


def _build_clarify():
    g = StateGraph(PromptGenState)
    g.add_node("clarify", clarify_node)
    g.add_edge(START, "clarify")
    g.add_edge("clarify", END)
    return g.compile()


def _should_improve(state: PromptGenState) -> str:
    """Conditional router for self-improvement loop.
    
    If the assessed prompt score is below 85, iteration_count is 0,
    and concrete suggestions exist, route to `improve_node`.
    Otherwise, complete to END.
    """
    overall_score = state.get("overall_score", 90)
    iteration_count = state.get("iteration_count", 0)
    suggestions = state.get("suggestions", [])

    if overall_score < 85 and iteration_count < 1 and suggestions:
        logger.info(
            "[workflow] Routing to self-improvement | score=%d iteration=%d suggestions=%d",
            overall_score,
            iteration_count,
            len(suggestions),
        )
        return "improve"

    logger.info(
        "[workflow] Completing workflow | score=%d iteration=%d",
        overall_score,
        iteration_count,
    )
    return "end"


def _build_gen_assess():
    g = StateGraph(PromptGenState)
    g.add_node("generate", generate_node)
    g.add_node("assess", assess_node)
    g.add_node("improve", improve_node)

    g.add_edge(START, "generate")
    g.add_edge("generate", "assess")
    g.add_conditional_edges(
        "assess",
        _should_improve,
        {
            "improve": "improve",
            "end": END,
        },
    )
    g.add_edge("improve", "assess")
    return g.compile()


clarify_workflow = _build_clarify()
gen_assess_workflow = _build_gen_assess()
