"""Minesweeper board primitives and environment-facing types."""

from sweeper.environment.board import (
    COVERED,
    FLAGGED,
    Coordinate,
    GameStatus,
    MinesweeperBoard,
    RevealResult,
)

__all__ = [
    "COVERED",
    "FLAGGED",
    "Coordinate",
    "GameStatus",
    "MinesweeperBoard",
    "RevealResult",
]
