"""Shared agent interfaces and decision records."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

import numpy as np


@dataclass(frozen=True)
class AgentDecision:
    """One selected action plus an honest account of its evidence."""

    action: int
    source: str
    mine_risk: float | None
    rationale: str


class Agent(Protocol):
    """Choose a flattened valid action from a visible environment observation."""

    def select_action(
        self,
        observation: np.ndarray,
        info: dict[str, Any],
    ) -> AgentDecision:
        """Return one action that is enabled by ``info[\"action_mask\"]``."""
