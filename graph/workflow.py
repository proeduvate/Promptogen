"""Two simple LangGraph pipelines — no interrupt(), no checkpoint required.

Python 3.10 does not support LangGraph's interrupt() in async contexts.
State between API calls is managed externally by api/pipeline.py.

Graph 1 — clarify_workflow:    START → clarify → END
Graph 2 — gen_assess_workflow: START → generate → assess → END
"""

from langgraph.graph import END, START, StateGraph

from graph.nodes import assess_node, clarify_node, generate_node
from graph.state import PromptGenState


def _build_clarify():
    g = StateGraph(PromptGenState)
    g.add_node("clarify", clarify_node)
    g.add_edge(START, "clarify")
    g.add_edge("clarify", END)
    return g.compile()


def _build_gen_assess():
    g = StateGraph(PromptGenState)
    g.add_node("generate", generate_node)
    g.add_node("assess", assess_node)
    g.add_edge(START, "generate")
    g.add_edge("generate", "assess")
    g.add_edge("assess", END)
    return g.compile()


clarify_workflow = _build_clarify()
gen_assess_workflow = _build_gen_assess()
