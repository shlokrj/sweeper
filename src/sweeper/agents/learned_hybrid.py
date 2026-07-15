"""Evidence-aware routing between symbolic, exact, and neural Minesweeper decisions."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from sweeper.agents.base import AgentDecision
from sweeper.agents.neural import NeuralAgent
from sweeper.agents.random_agent import _valid_actions
from sweeper.solvers import ExactSolver, SymbolicSolver


class NeuralHybridAgent:
    """Use proofs and exact risks before falling back to a learned risk estimate."""

    def __init__(
        self,
        checkpoint: Path,
        *,
        max_component_size: int = 18,
        device: str | None = None,
    ) -> None:
        self._symbolic = SymbolicSolver()
        self._exact = ExactSolver(max_component_size=max_component_size)
        self._neural = NeuralAgent(checkpoint, device=device)

    def select_action(self, observation: np.ndarray, info: dict[str, Any]) -> AgentDecision:
        """Select a move using the strongest currently available evidence."""

        valid_actions = set(_valid_actions(info))
        symbolic = self._symbolic.solve(observation)
        safe_actions = sorted(
            row * observation.shape[1] + column
            for row, column in symbolic.safe_cells
            if row * observation.shape[1] + column in valid_actions
        )
        if safe_actions:
            action = safe_actions[0]
            proof = symbolic.proof_for(divmod(action, observation.shape[1]))
            return AgentDecision(
                action=action,
                source="neural_hybrid_symbolic",
                mine_risk=0.0,
                rationale=f"proved safe by the {proof.rule} rule",
            )

        exact = self._exact.solve(observation, mine_count=int(info["mine_count"]))
        if exact.exact and exact.consistent:
            probabilities = {
                action: exact.probability_for(divmod(action, observation.shape[1]))
                for action in valid_actions
            }
            if all(probability is not None for probability in probabilities.values()):
                action = min(
                    valid_actions,
                    key=lambda candidate: (float(probabilities[candidate]), candidate),
                )
                probability = float(probabilities[action])
                return AgentDecision(
                    action=action,
                    source="neural_hybrid_exact",
                    mine_risk=probability,
                    rationale=(
                        f"selected the lowest exact risk from {exact.configuration_count} "
                        "valid mine configurations"
                    ),
                )

        neural = self._neural.select_action(observation, info)
        return AgentDecision(
            action=neural.action,
            source="neural_hybrid_neural",
            mine_risk=neural.mine_risk,
            rationale="exact enumeration was unavailable; " + neural.rationale,
        )
