"""
Strategies package — attack & test strategy implementations.

Each strategy maps to a risk_category and generates prompts for that
specific OWASP / behavioural category.
"""

from __future__ import annotations

from app.engine.strategies.base import BaseStrategy, PromptSpec
from app.engine.strategies.prompt_injection import PromptInjectionStrategy
from app.engine.strategies.insecure_output import InsecureOutputStrategy
from app.engine.strategies.data_poisoning import DataPoisoningStrategy
from app.engine.strategies.model_dos import ModelDoSStrategy
from app.engine.strategies.supply_chain import SupplyChainStrategy
from app.engine.strategies.info_disclosure import InfoDisclosureStrategy
from app.engine.strategies.insecure_plugin import InsecurePluginStrategy
from app.engine.strategies.excessive_agency import ExcessiveAgencyStrategy
from app.engine.strategies.overreliance import OverrelianceStrategy
from app.engine.strategies.model_theft import ModelTheftStrategy
from app.engine.strategies.owasp_agentic import OWASPAgenticStrategy
from app.engine.strategies.adaptive import AdaptiveStrategy
from app.engine.strategies.user_interaction import UserInteractionStrategy
from app.engine.strategies.functional import FunctionalStrategy
from app.engine.strategies.scope_validation import ScopeValidationStrategy

# Registry: risk_category → Strategy class
STRATEGY_REGISTRY: dict[str, type[BaseStrategy]] = {
    "prompt_injection": PromptInjectionStrategy,
    "insecure_output": InsecureOutputStrategy,
    "data_poisoning": DataPoisoningStrategy,
    "model_dos": ModelDoSStrategy,
    "supply_chain": SupplyChainStrategy,
    "info_disclosure": InfoDisclosureStrategy,
    "insecure_plugin": InsecurePluginStrategy,
    "excessive_agency": ExcessiveAgencyStrategy,
    "overreliance": OverrelianceStrategy,
    "model_theft": ModelTheftStrategy,
    # Agentic categories
    "agentic_tool_abuse": OWASPAgenticStrategy,
    "agentic_param_injection": OWASPAgenticStrategy,
    "agentic_cot_hijack": OWASPAgenticStrategy,
    "agentic_memory_poison": OWASPAgenticStrategy,
    "agentic_exfiltration": OWASPAgenticStrategy,
    "agentic_priv_escalation": OWASPAgenticStrategy,
    # Behavioural
    "user_interaction": UserInteractionStrategy,
    "functional": FunctionalStrategy,
    "scope_validation": ScopeValidationStrategy,
    # Adaptive (multi-turn)
    "adaptive": AdaptiveStrategy,
    # Behavioural sub-categories (mapped)
    "happy_path": UserInteractionStrategy,
    "edge_cases": UserInteractionStrategy,
    "error_handling": UserInteractionStrategy,
    "tone_style": UserInteractionStrategy,
    "accessibility": UserInteractionStrategy,
    "core_functionality": FunctionalStrategy,
    "integration_points": FunctionalStrategy,
    "data_handling": FunctionalStrategy,
    "performance": FunctionalStrategy,
    "consistency": FunctionalStrategy,
    "in_scope_requests": ScopeValidationStrategy,
    "out_of_scope_requests": ScopeValidationStrategy,
    "boundary_probes": ScopeValidationStrategy,
    "policy_compliance": ScopeValidationStrategy,
    "ethical_alignment": ScopeValidationStrategy,
    # Multi-turn agentic categories
    "tool_abuse": OWASPAgenticStrategy,
    "permission_escalation": OWASPAgenticStrategy,
    "data_exfiltration": OWASPAgenticStrategy,
    "multi_step_manipulation": OWASPAgenticStrategy,
    "memory_poisoning": OWASPAgenticStrategy,
    "environment_escape": OWASPAgenticStrategy,
}


def get_strategy(risk_category: str) -> BaseStrategy:
    """Get strategy instance for the given risk category."""
    cls = STRATEGY_REGISTRY.get(risk_category)
    if cls is None:
        # Fallback to prompt injection
        cls = PromptInjectionStrategy
    strategy = cls()
    # Override risk_category if the strategy is generic (agentic)
    if hasattr(strategy, "risk_category"):
        if strategy.risk_category == "" or strategy.risk_category == "agentic":
            strategy.risk_category = risk_category
    return strategy


__all__ = [
    "BaseStrategy",
    "PromptSpec",
    "STRATEGY_REGISTRY",
    "get_strategy",
]
