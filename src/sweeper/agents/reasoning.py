"""Agents that route decisions through symbolic and exact solvers."""

from __future__ import annotations

from typing import Any

import numpy as np

from sweeper.agents.base import AgentDecision
from sweeper.agents.heuristic import LocalRiskAgent
from sweeper.agents.random_agent import _valid_actions
from sweeper.solvers import ExactSolver, SymbolicSolver


class SymbolicAgent:
    """Take guaranteed symbolic moves, then defer to a local-risk fallback."""

    def __init__(self, *, fallback: LocalRiskAgent | None = None) -> None:
        self._solver = SymbolicSolver()
        self._fallback = fallback or LocalRiskAgent()

    def select_action(self, observation: np.ndarray, info: dict[str, Any]) -> AgentDecision:
        """Prefer a proved-safe action when one is currently available."""

        valid_actions = set(_valid_actions(info))
        result = self._solver.solve(observation)
        safe_actions = sorted(
            row * observation.shape[1] + column
            for row, column in result.safe_cells
            if row * observation.shape[1] + column in valid_actions
        )
        if safe_actions:
            action = safe_actions[0]
            proof = result.proof_for(divmod(action, observation.shape[1]))
            return AgentDecision(
                action=action,
                source="symbolic",
                mine_risk=0.0,
                rationale=f"proved safe by the {proof.rule} rule",
            )

        fallback = self._fallback.select_action(observation, info)
        return AgentDecision(
            action=fallback.action,
            source="symbolic_fallback",
            mine_risk=fallback.mine_risk,
            rationale="no guaranteed safe move; " + fallback.rationale,
        )


class ExactAgent:
    """Choose the lowest exact mine probability when enumeration completes."""

    def __init__(
        self,
        *,
        max_component_size: int = 18,
        fallback: LocalRiskAgent | None = None,
    ) -> None:
        self._solver = ExactSolver(max_component_size=max_component_size)
        self._fallback = fallback or LocalRiskAgent()

    def select_action(self, observation: np.ndarray, info: dict[str, Any]) -> AgentDecision:
        """Use exact probabilities when tractable, otherwise use the local heuristic."""

        valid_actions = _valid_actions(info)
        result = self._solver.solve(observation, mine_count=int(info["mine_count"]))
        if result.exact and result.consistent:
            probabilities = {
                action: result.probability_for(divmod(action, observation.shape[1]))
                for action in valid_actions
            }
            action = min(valid_actions, key=lambda candidate: (probabilities[candidate], candidate))
            probability = probabilities[action]
            if probability is not None:
                return AgentDecision(
                    action=action,
                    source="exact",
                    mine_risk=probability,
                    rationale=(
                        f"selected the lowest exact risk from {result.configuration_count} "
                        "valid mine configurations"
                    ),
                )

        fallback = self._fallback.select_action(observation, info)
        return AgentDecision(
            action=fallback.action,
            source="exact_fallback",
            mine_risk=fallback.mine_risk,
            rationale="exact enumeration was unavailable; " + fallback.rationale,
        )


class HybridAgent:
    """Route moves through proofs, exact probabilities, then heuristic estimates."""

    def __init__(self, *, max_component_size: int = 18) -> None:
        self._symbolic = SymbolicAgent()
        self._exact = ExactAgent(max_component_size=max_component_size)

    def select_action(self, observation: np.ndarray, info: dict[str, Any]) -> AgentDecision:
        """Use the strongest available evidence without overstating certainty."""

        symbolic = self._symbolic.select_action(observation, info)
        if symbolic.source == "symbolic":
            return AgentDecision(
                action=symbolic.action,
                source="hybrid_symbolic",
                mine_risk=0.0,
                rationale=symbolic.rationale,
            )

        exact = self._exact.select_action(observation, info)
        if exact.source == "exact":
            return AgentDecision(
                action=exact.action,
                source="hybrid_exact",
                mine_risk=exact.mine_risk,
                rationale=exact.rationale,
            )
        return AgentDecision(
            action=exact.action,
            source="hybrid_heuristic",
            mine_risk=exact.mine_risk,
            rationale=exact.rationale,
        )
