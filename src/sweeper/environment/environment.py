"""Gymnasium-compatible environment wrapper for MinesweeperBoard."""

from __future__ import annotations

from dataclasses import dataclass
from numbers import Integral
from typing import Any, Literal

import gymnasium as gym
import numpy as np

from sweeper.environment.board import Coordinate, GameStatus, MinesweeperBoard, RevealResult


@dataclass(frozen=True)
class ReplayEvent:
    """An immutable record of the board state after a reset or reveal action."""

    kind: Literal["reset", "reveal"]
    episode_seed: int
    action: int | None
    coordinate: Coordinate | None
    reward: float
    revealed: frozenset[Coordinate]
    hit_mine: bool
    status: GameStatus
    observation: tuple[tuple[int, ...], ...]


class MinesweeperEnv(gym.Env[np.ndarray, int]):
    """Expose Minesweeper through the Gymnasium reset and step interface.

    Actions are flattened reveal coordinates: ``action = row * columns + column``.
    The observation is only the board's visible-state matrix. Each newly revealed
    safe cell earns ``+1`` reward and selecting a mine earns ``-1``.
    """

    metadata = {"render_modes": []}

    def __init__(
        self,
        rows: int,
        columns: int,
        mine_count: int,
        *,
        safe_first_click: bool = True,
    ) -> None:
        super().__init__()

        MinesweeperBoard._validate_dimensions(rows, columns, mine_count)
        self.rows = rows
        self.columns = columns
        self.mine_count = mine_count
        self.safe_first_click = safe_first_click
        self.action_space = gym.spaces.Discrete(rows * columns)
        self.observation_space = gym.spaces.Box(
            low=-2,
            high=8,
            shape=(rows, columns),
            dtype=np.int8,
        )
        self._board: MinesweeperBoard | None = None
        self._episode_seed: int | None = None
        self._replay_events: list[ReplayEvent] = []

    @property
    def episode_seed(self) -> int | None:
        """Return the recorded seed for the current episode."""

        return self._episode_seed

    @property
    def replay_events(self) -> tuple[ReplayEvent, ...]:
        """Return immutable reset and action records for the current episode."""

        return tuple(self._replay_events)

    def reset(
        self,
        *,
        seed: int | None = None,
        options: dict[str, Any] | None = None,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        """Start a fresh seeded board and return its visible observation and info."""

        if options:
            raise ValueError("reset options are not supported yet")
        super().reset(seed=seed)

        self._episode_seed = (
            int(self.np_random.integers(0, np.iinfo(np.int64).max)) if seed is None else int(seed)
        )
        self._board = MinesweeperBoard(
            self.rows,
            self.columns,
            self.mine_count,
            seed=self._episode_seed,
            safe_first_click=self.safe_first_click,
        )
        self._replay_events = []

        observation = self._observation()
        self._replay_events.append(
            ReplayEvent(
                kind="reset",
                episode_seed=self._episode_seed,
                action=None,
                coordinate=None,
                reward=0.0,
                revealed=frozenset(),
                hit_mine=False,
                status=self._board.status,
                observation=self._board.visible_state,
            )
        )
        return observation, self._info()

    def step(self, action: int) -> tuple[np.ndarray, float, bool, bool, dict[str, Any]]:
        """Reveal one valid flattened action and record the transition."""

        board = self._require_active_board()
        normalized_action = self._normalize_action(action)
        action_mask = self._action_mask(board)
        if not action_mask[normalized_action]:
            raise ValueError("action must target a covered, unflagged cell")

        coordinate = divmod(normalized_action, self.columns)
        result = board.reveal(coordinate)
        reward = -1.0 if result.hit_mine else float(len(result.revealed))
        terminated = board.status is not GameStatus.ACTIVE
        observation = self._observation()

        self._replay_events.append(
            ReplayEvent(
                kind="reveal",
                episode_seed=self._episode_seed,
                action=normalized_action,
                coordinate=coordinate,
                reward=reward,
                revealed=result.revealed,
                hit_mine=result.hit_mine,
                status=board.status,
                observation=board.visible_state,
            )
        )
        return observation, reward, terminated, False, self._info(result)

    def _require_active_board(self) -> MinesweeperBoard:
        if self._board is None:
            raise RuntimeError("reset must be called before step")
        if self._board.status is not GameStatus.ACTIVE:
            raise RuntimeError("reset must be called after a terminal game")
        return self._board

    def _normalize_action(self, action: int) -> int:
        if isinstance(action, bool) or not isinstance(action, Integral):
            raise TypeError("action must be an integer")
        normalized_action = int(action)
        if not self.action_space.contains(normalized_action):
            raise ValueError("action is outside the board")
        return normalized_action

    def _observation(self) -> np.ndarray:
        board = self._board
        if board is None:
            raise RuntimeError("reset must be called before requesting an observation")
        return np.asarray(board.visible_state, dtype=np.int8)

    def _action_mask(self, board: MinesweeperBoard) -> np.ndarray:
        mask = np.zeros(self.action_space.n, dtype=np.bool_)
        for row, column in board.valid_reveals():
            mask[row * self.columns + column] = True
        return mask

    def _info(self, result: RevealResult | None = None) -> dict[str, Any]:
        board = self._board
        if board is None:
            raise RuntimeError("reset must be called before requesting info")
        return {
            "action_mask": self._action_mask(board),
            "remaining_mines": board.remaining_mines,
            "status": board.status.value,
            "episode_seed": self._episode_seed,
            "revealed": frozenset() if result is None else result.revealed,
        }
