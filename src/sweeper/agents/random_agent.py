"""A reproducible random baseline agent."""

from __future__ import annotations

from random import Random
from typing import Any

import numpy as np

from sweeper.agents.base import AgentDecision


class RandomAgent:
    """Select a random action from the environment's current action mask."""

    def __init__(self, *, seed: int | None = None) -> None:
        self._random = Random(seed)

    def select_action(self, observation: np.ndarray, info: dict[str, Any]) -> AgentDecision:
        """Return a valid action without making a claim about its safety."""

        del observation
        actions = _valid_actions(info)
        action = self._random.choice(actions)
        return AgentDecision(
            action=action,
            source="random",
            mine_risk=None,
            rationale="selected uniformly from the currently valid reveal actions",
        )


def _valid_actions(info: dict[str, Any]) -> list[int]:
    mask = np.asarray(info.get("action_mask"), dtype=np.bool_)
    if mask.ndim != 1:
        raise ValueError("info['action_mask'] must be a one-dimensional boolean array")
    actions = np.flatnonzero(mask).tolist()
    if not actions:
        raise RuntimeError("agent received no valid actions")
    return [int(action) for action in actions]
