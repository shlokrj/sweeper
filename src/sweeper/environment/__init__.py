"""Minesweeper board primitives and environment-facing types."""

from sweeper.environment.board import (
    COVERED,
    FLAGGED,
    Coordinate,
    GameStatus,
    MinesweeperBoard,
    RevealResult,
)
from sweeper.environment.environment import MinesweeperEnv, ReplayEvent

__all__ = [
    "COVERED",
    "FLAGGED",
    "Coordinate",
    "GameStatus",
    "MinesweeperBoard",
    "MinesweeperEnv",
    "ReplayEvent",
    "RevealResult",
]
