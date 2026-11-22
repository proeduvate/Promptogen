"""Prompt Readiness analysis service.

Evaluates user answers, context additions, and original requirements against
clarification questions to provide deterministic, real-time readiness scoring,
missing context detection, and generation policy gating.
"""

import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple

from schemas.readiness import (
    CollectedContextItem,
    GenerationPolicy,
    MissingContextGap,
    ReadinessAnalysisRequest,
    ReadinessAnalysisResponse,
    ReadinessScore,
    ReadinessStatus,
    ReadinessWarning,
)

logger = logging.getLogger("promptgen.services.readiness")


class ReadinessService:
    """Evaluates readiness of prompt requirements based on collected context."""

    @staticmethod
    def analyze(
        request: ReadinessAnalysisRequest,
        stored: Optional[Dict[str, Any]] = None,
    ) -> ReadinessAnalysisResponse:
        stored_data = stored or {}
        original_query = str(stored_data.get("original_query") or "").strip()
        questions = stored_data.get("questions") or []
        is_sufficient = bool(stored_data.get("is_sufficient", False))
        task_domain = str(stored_data.get("task_domain") or "general")

        # Index user answers by stringified question_id
        answer_by_qid: Dict[str, Tuple[Any, str]] = {}
        for ans in request.answers:
            qid_str = str(ans.question_id)
            val = ""
            if ans.custom_input and ans.custom_input.strip():
                val = ans.custom_input.strip()
            elif isinstance(ans.selected_option, list):
                val = ", ".join(str(opt).strip() for opt in ans.selected_option if str(opt).strip())
            elif ans.selected_option and str(ans.selected_option).strip():
                val = str(ans.selected_option).strip()

            answer_by_qid[qid_str] = (ans, val)

        # Index context additions by gap_id
        addition_by_gap_id: Dict[str, Any] = {}
        for add in request.context_additions:
            if add.value and add.value.strip():
                addition_by_gap_id[str(add.gap_id)] = add

        collected_context: List[CollectedContextItem] = []
        missing_context: List[MissingContextGap] = []
        warnings: List[ReadinessWarning] = []

        # 1. Primary goal from original query
        if original_query:
            short_goal = original_query[:160] + ("…" if len(original_query) > 160 else "")
            collected_context.append(
                CollectedContextItem(
                    id="goal",
                    label="Primary Goal",
                    value=short_goal,
                    source="original_prompt",
                    question_id=None,
                )
            )

        # 2. Additions from freeform context additions
        for gap_id, add in addition_by_gap_id.items():
            gap_label = add.label or f"Context ({gap_id.replace('gap-', '').replace('_', ' ').title()})"
            collected_context.append(
                CollectedContextItem(
                    id=f"addition-{gap_id}",
                    label=gap_label,
                    value=add.value.strip(),
                    source="context_addition",
                    question_id=None,
                )
            )

        # 3. Additional freeform context text
        if request.additional_context and request.additional_context.strip():
            collected_context.append(
                CollectedContextItem(
                    id="additional_context",
                    label="Additional Instructions",
                    value=request.additional_context.strip(),
                    source="additional_context",
                    question_id=None,
                )
            )

        # 4. Check questions and identify answered vs missing gaps
        total_weight = 0
        earned_weight = 0

        for q in questions:
            q_id = q.get("id")
            qid_str = str(q_id)
            level = str(q.get("level") or "recommended").lower()
            if level not in ("required", "recommended", "optional"):
                level = "recommended"

            weight = 3 if level == "required" else 2 if level == "recommended" else 1
            total_weight += weight

            # Check if answered
            ans_tuple = answer_by_qid.get(qid_str)
            ans_val = ans_tuple[1] if ans_tuple else ""

            # Check if covered by a context addition targeting this gap
            addition_covered = (
                f"gap-{qid_str}" in addition_by_gap_id
                or f"context-gap-{qid_str}" in addition_by_gap_id
            )

            if ans_val:
                earned_weight += weight
                q_text = str(q.get("question") or f"Question {q_id}")
                collected_context.append(
                    CollectedContextItem(
                        id=f"answer-{qid_str}",
                        label=q_text,
                        value=ans_val,
                        source="question_answer",
                        question_id=q_id,
                    )
                )
            elif addition_covered:
                earned_weight += weight
            else:
                # Missing gap
                options = q.get("options") or []
                hint = f"e.g., {options[0]}" if options else "Provide specific details..."
                missing_context.append(
                    MissingContextGap(
                        id=f"gap-{qid_str}",
                        label=str(q.get("question") or f"Question {q_id}"),
                        description=str(q.get("explanation") or f"Specify requirements for: {q.get('question')}"),
                        importance=level,
                        question_id=q_id,
                        input_hint=hint,
                    )
                )

        # Context additions and extra instructions also contribute bonus weight
        earned_weight += min(len(addition_by_gap_id) * 2, 8)
        if request.additional_context and request.additional_context.strip():
            earned_weight += 2

        # 5. Determine Readiness Score, Status, and Generation Policy
        if len(questions) == 0:
            if is_sufficient:
                percentage = 96
                status: ReadinessStatus = "ready_to_generate"
                can_generate = True
                can_generate_anyway = True
                reason = "Initial prompt has comprehensive architectural context."
            else:
                percentage = 75
                status = "partially_ready"
                can_generate = False
                can_generate_anyway = True
                reason = "You can generate now with default options, or add details."
        else:
            base_pts = 25  # baseline from original prompt
            q_ratio = earned_weight / max(total_weight, 1)
            raw_score = int(round(base_pts + min(75, q_ratio * 75)))
            raw_score = max(0, min(100, raw_score))

            missing_required = [g for g in missing_context if g.importance == "required"]
            missing_recommended = [g for g in missing_context if g.importance == "recommended"]

            if missing_required:
                percentage = min(raw_score, 50)
                status = "needs_more_details"
                can_generate = False
                can_generate_anyway = False
                req_names = ", ".join(g.label for g in missing_required[:2])
                reason = f"Add the required details ({req_names}) before generating."
                warnings.append(
                    ReadinessWarning(
                        code="MISSING_REQUIRED_CONTEXT",
                        severity="error",
                        message=f"Required context ({req_names}) is missing. The generated prompt cannot be constructed without assumptions.",
                    )
                )
            elif missing_recommended:
                if raw_score >= 85:
                    percentage = raw_score
                    status = "ready_to_generate"
                    can_generate = True
                    can_generate_anyway = True
                    reason = "Ready to generate prompt with solid context."
                else:
                    percentage = max(raw_score, 65)
                    status = "partially_ready"
                    can_generate = False
                    can_generate_anyway = True
                    rec_names = ", ".join(g.label for g in missing_recommended[:2])
                    reason = f"Some recommended details are missing, but you can generate now with standard defaults."
                    warnings.append(
                        ReadinessWarning(
                            code="MISSING_RECOMMENDED_CONTEXT",
                            severity="warning",
                            message=f"Recommended context ({rec_names}) was omitted; default assumptions will be applied.",
                        )
                    )
            else:
                percentage = max(raw_score, 90)
                status = "ready_to_generate"
                can_generate = True
                can_generate_anyway = True
                reason = "All necessary requirements met. Ready to synthesize prompt."

        analysis_id = f"readiness_{uuid.uuid4().hex[:12]}"

        return ReadinessAnalysisResponse(
            thread_id=request.thread_id,
            client_revision=request.client_revision,
            analysis_id=analysis_id,
            readiness=ReadinessScore(
                percentage=percentage,
                status=status,
            ),
            collected_context=collected_context,
            missing_context=missing_context,
            warnings=warnings,
            generation_policy=GenerationPolicy(
                can_generate=can_generate,
                can_generate_anyway=can_generate_anyway,
                reason=reason,
            ),
        )
