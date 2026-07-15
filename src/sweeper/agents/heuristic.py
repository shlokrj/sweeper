"""A local mine-risk baseline for visible Minesweeper clues."""

from __future__ import annotations

from typing import Any

import numpy as np

from sweeper.agents.base import AgentDecision
from sweeper.agents.random_agent import _valid_actions
from sweeper.environment import COVERED, FLAGGED


class LocalRiskAgent:
    """Choose the lowest average local mine-risk estimate among valid actions."""

    def select_action(self, observation: np.ndarray, info: dict[str, Any]) -> AgentDecision:
        """Estimate risk from adjacent clues, falling back to global mine density."""

        if observation.ndim != 2:
            raise ValueError("observation must be a two-dimensional board matrix")

        actions = _valid_actions(info)
        rows, columns = observation.shape
        remaining_mines = int(info["remaining_mines"])
        global_risk = _clamp_risk(remaining_mines / len(actions))
        risks = {
            action: self._risk_for_action(
                observation,
                action,
                columns,
                global_risk,
            )
            for action in actions
        }
        action = min(actions, key=lambda candidate: (risks[candidate], candidate))
        local_estimate_count = self._local_estimate_count(observation, action, columns)
        rationale = (
            f"averaged {local_estimate_count} adjacent clue estimate(s)"
            if local_estimate_count
            else "used the remaining global mine density because no adjacent clue applies"
        )
        return AgentDecision(
            action=action,
            source="local_heuristic",
            mine_risk=risks[action],
            rationale=rationale,
        )

    def _risk_for_action(
        self,
        observation: np.ndarray,
        action: int,
        columns: int,
        global_risk: float,
    ) -> float:
        estimates = self._local_estimates(observation, action, columns)
        return float(sum(estimates) / len(estimates)) if estimates else global_risk

    def _local_estimate_count(self, observation: np.ndarray, action: int, columns: int) -> int:
        return len(self._local_estimates(observation, action, columns))

    def _local_estimates(self, observation: np.ndarray, action: int, columns: int) -> list[float]:
        rows = observation.shape[0]
        row, column = divmod(action, columns)
        estimates: list[float] = []

        for clue_row, clue_column in _neighbors(row, column, rows, columns):
            clue = int(observation[clue_row, clue_column])
            if not 0 <= clue <= 8:
                continue

            neighboring_cells = tuple(_neighbors(clue_row, clue_column, rows, columns))
            covered_count = sum(
                int(observation[neighbor_row, neighbor_column]) == COVERED
                for neighbor_row, neighbor_column in neighboring_cells
            )
            if covered_count == 0:
                continue
            flagged_count = sum(
                int(observation[neighbor_row, neighbor_column]) == FLAGGED
                for neighbor_row, neighbor_column in neighboring_cells
            )
            estimates.append(_clamp_risk((clue - flagged_count) / covered_count))

        return estimates


def _neighbors(row: int, column: int, rows: int, columns: int) -> tuple[tuple[int, int], ...]:
    return tuple(
        (neighbor_row, neighbor_column)
        for neighbor_row in range(max(0, row - 1), min(rows, row + 2))
        for neighbor_column in range(max(0, column - 1), min(columns, column + 2))
        if (neighbor_row, neighbor_column) != (row, column)
    )


def _clamp_risk(risk: float) -> float:
    return min(max(risk, 0.0), 1.0)
