"""
Test planner — selects templates, allocates budget across categories,
and produces an ordered list of GenerationTasks.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.engine.context import ExperimentContext


# ---------------------------------------------------------------------------
# Weight tables (from Phase 7 §5.2)
# ---------------------------------------------------------------------------

OWASP_TOP10_WEIGHTS: dict[str, float] = {
    "prompt_injection": 0.20,
    "insecure_output": 0.10,
    "data_poisoning": 0.05,
    "model_dos": 0.05,
    "supply_chain": 0.05,
    "info_disclosure": 0.15,
    "insecure_plugin": 0.08,
    "excessive_agency": 0.12,
    "overreliance": 0.10,
    "model_theft": 0.05,
    "_converter_variants": 0.05,
}

OWASP_AGENTIC_WEIGHTS: dict[str, float] = {
    "agentic_tool_abuse": 0.25,
    "agentic_priv_escalation": 0.20,
    "agentic_exfiltration": 0.20,
    "agentic_multi_step": 0.15,
    "agentic_memory_poison": 0.10,
    "agentic_env_escape": 0.10,
}

BEHAVIOURAL_USER_INTERACTION_WEIGHTS: dict[str, float] = {
    "happy_path": 0.25,
    "edge_cases": 0.25,
    "error_handling": 0.20,
    "tone_style": 0.15,
    "accessibility": 0.15,
}

BEHAVIOURAL_FUNCTIONAL_WEIGHTS: dict[str, float] = {
    "core_functionality": 0.30,
    "integration_points": 0.20,
    "data_handling": 0.20,
    "performance": 0.15,
    "consistency": 0.15,
}

BEHAVIOURAL_SCOPE_WEIGHTS: dict[str, float] = {
    "in_scope": 0.20,
    "out_of_scope": 0.25,
    "boundary_probes": 0.20,
    "policy_compliance": 0.20,
    "ethical_alignment": 0.15,
}

WEIGHT_TABLES: dict[tuple[str, str], dict[str, float]] = {
    ("adversarial", "owasp_llm_top10"): OWASP_TOP10_WEIGHTS,
    ("adversarial", "owasp_agentic"): OWASP_AGENTIC_WEIGHTS,
    ("adversarial", "adaptive"): {},  # Adaptive uses a different planning model
    ("behavioural", "user_interaction"): BEHAVIOURAL_USER_INTERACTION_WEIGHTS,
    ("behavioural", "functional"): BEHAVIOURAL_FUNCTIONAL_WEIGHTS,
    ("behavioural", "scope_validation"): BEHAVIOURAL_SCOPE_WEIGHTS,
}


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class GenerationTask:
    """A single generation unit: produce N prompts for a category."""

    category: str
    template_ids: list[str] = field(default_factory=list)
    allocated_count: int = 0
    owasp_id: str | None = None
    expected_behaviour: str | None = None  # Behavioural only


@dataclass
class TestPlan:
    """Complete plan output from the planner."""

    tasks: list[GenerationTask]
    total_budget: int
    converters_enabled: bool
    converter_probability: float
    max_converter_chain: int
    llm_augmentation_variants: int


# ---------------------------------------------------------------------------
# Category → OWASP ID mapping
# ---------------------------------------------------------------------------

CATEGORY_OWASP: dict[str, str] = {
    "prompt_injection": "LLM01",
    "insecure_output": "LLM02",
    "data_poisoning": "LLM03",
    "model_dos": "LLM04",
    "supply_chain": "LLM05",
    "info_disclosure": "LLM06",
    "insecure_plugin": "LLM07",
    "excessive_agency": "LLM08",
    "overreliance": "LLM09",
    "model_theft": "LLM10",
}


# ---------------------------------------------------------------------------
# Planner
# ---------------------------------------------------------------------------


def create_test_plan(ctx: ExperimentContext) -> TestPlan:
    """
    Build an ordered test plan based on experiment configuration.

    For adversarial/adaptive experiments, budget = total_tests ÷ max_turns.
    For all others, budget is distributed across categories by weight.
    """
    total = ctx.total_tests
    key = (ctx.experiment_type, ctx.sub_type)
    weights = WEIGHT_TABLES.get(key, {})

    # Converter / augmentation scaling by testing level
    if ctx.testing_level == "basic":
        converter_prob = 0.20
        max_chain = 1
        augment_variants = 1
    elif ctx.testing_level == "moderate":
        converter_prob = 0.40
        max_chain = 2
        augment_variants = 2
    else:  # aggressive
        converter_prob = 0.50
        max_chain = 3
        augment_variants = 3

    converters_enabled = ctx.experiment_type == "adversarial"

    # Adaptive: each test is a multi-turn conversation
    if ctx.sub_type == "adaptive":
        max_turns = 5
        conversations = total // max_turns
        tasks = [
            GenerationTask(
                category="adaptive_escalation",
                allocated_count=conversations,
            )
        ]
        return TestPlan(
            tasks=tasks,
            total_budget=total,
            converters_enabled=False,  # Adaptive doesn't use converters
            converter_probability=0.0,
            max_converter_chain=0,
            llm_augmentation_variants=augment_variants,
        )

    # Weighted distribution
    tasks: list[GenerationTask] = []
    allocated = 0
    categories = [(cat, w) for cat, w in weights.items() if not cat.startswith("_")]
    for i, (cat, w) in enumerate(categories):
        if i == len(categories) - 1:
            count = total - allocated  # Remainder goes to last category
        else:
            count = math.floor(total * w)
        allocated += count
        tasks.append(
            GenerationTask(
                category=cat,
                allocated_count=count,
                owasp_id=CATEGORY_OWASP.get(cat),
            )
        )

    return TestPlan(
        tasks=tasks,
        total_budget=total,
        converters_enabled=converters_enabled,
        converter_probability=converter_prob,
        max_converter_chain=max_chain,
        llm_augmentation_variants=augment_variants,
    )
