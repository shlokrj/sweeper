"""Generate reproducible Minesweeper states labeled by exact solvers."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import numpy as np

from sweeper.environment import GameStatus, MinesweeperBoard
from sweeper.solvers import ExactSolver, SymbolicSolver


@dataclass(frozen=True)
class GenerationConfig:
    """Configuration for one reproducible labeled-state generation run."""

    rows: int
    columns: int
    mine_count: int
    seeds: tuple[int, ...]
    max_steps_per_game: int = 200
    max_component_size: int = 18
    initial_click_policy: Literal["center", "seeded_uniform"] = "center"


@dataclass(frozen=True)
class LabeledState:
    """One model-ready visible state and solver-derived supervision targets."""

    seed: int
    step: int
    observation: np.ndarray
    action_mask: np.ndarray
    mine_probabilities: np.ndarray
    ground_truth_mines: np.ndarray
    symbolic_safe_mask: np.ndarray
    symbolic_mine_mask: np.ndarray


def generate_labeled_states(config: GenerationConfig) -> tuple[LabeledState, ...]:
    """Play seeded games and retain states for which exact labels are tractable."""

    if config.max_steps_per_game <= 0:
        raise ValueError("max_steps_per_game must be positive")
    if config.initial_click_policy not in {"center", "seeded_uniform"}:
        raise ValueError("initial_click_policy must be 'center' or 'seeded_uniform'")

    exact_solver = ExactSolver(max_component_size=config.max_component_size)
    symbolic_solver = SymbolicSolver()
    states: list[LabeledState] = []

    for seed in config.seeds:
        board = MinesweeperBoard(
            config.rows,
            config.columns,
            config.mine_count,
            seed=seed,
        )
        board.reveal(
            _initial_coordinate(
                config.rows,
                config.columns,
                seed,
                config.initial_click_policy,
            )
        )
        step = 0

        while board.status is GameStatus.ACTIVE and step < config.max_steps_per_game:
            observation = np.asarray(board.visible_state, dtype=np.int8)
            exact = exact_solver.solve(observation, config.mine_count)
            symbolic = symbolic_solver.solve(observation)
            action_mask = _action_mask(board)

            if exact.exact and exact.consistent:
                states.append(
                    _label_state(
                        seed=seed,
                        step=step,
                        board=board,
                        observation=observation,
                        action_mask=action_mask,
                        exact_probabilities=exact.mine_probabilities,
                        symbolic_safe_cells=symbolic.safe_cells,
                        symbolic_mine_cells=symbolic.mine_cells,
                    )
                )

            action = _next_action(
                board=board,
                action_mask=action_mask,
                probabilities=exact.mine_probabilities,
                safe_cells=symbolic.safe_cells,
            )
            board.reveal(divmod(action, config.columns))
            step += 1

    return tuple(states)


def save_dataset(path: Path, states: tuple[LabeledState, ...]) -> None:
    """Persist fixed-shape labeled states as one compressed NumPy archive."""

    if not states:
        raise ValueError("cannot save an empty labeled-state collection")

    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        path,
        seeds=np.asarray([state.seed for state in states], dtype=np.int64),
        steps=np.asarray([state.step for state in states], dtype=np.int32),
        observations=np.stack([state.observation for state in states]),
        action_masks=np.stack([state.action_mask for state in states]),
        mine_probabilities=np.stack([state.mine_probabilities for state in states]),
        ground_truth_mines=np.stack([state.ground_truth_mines for state in states]),
        symbolic_safe_masks=np.stack([state.symbolic_safe_mask for state in states]),
        symbolic_mine_masks=np.stack([state.symbolic_mine_mask for state in states]),
    )


def _initial_coordinate(
    rows: int,
    columns: int,
    seed: int,
    policy: Literal["center", "seeded_uniform"],
) -> tuple[int, int]:
    if policy == "center":
        return rows // 2, columns // 2
    generator = np.random.default_rng(seed)
    return int(generator.integers(rows)), int(generator.integers(columns))


def _action_mask(board: MinesweeperBoard) -> np.ndarray:
    mask = np.zeros(board.rows * board.columns, dtype=np.bool_)
    for row, column in board.valid_reveals():
        mask[row * board.columns + column] = True
    return mask


def _label_state(
    *,
    seed: int,
    step: int,
    board: MinesweeperBoard,
    observation: np.ndarray,
    action_mask: np.ndarray,
    exact_probabilities: dict[tuple[int, int], float],
    symbolic_safe_cells: frozenset[tuple[int, int]],
    symbolic_mine_cells: frozenset[tuple[int, int]],
) -> LabeledState:
    probabilities = np.full(observation.shape, np.nan, dtype=np.float32)
    for (row, column), probability in exact_probabilities.items():
        probabilities[row, column] = probability

    ground_truth = np.zeros(observation.shape, dtype=np.bool_)
    for row, column in board.hidden_mines:
        ground_truth[row, column] = True

    safe_mask = np.zeros(observation.shape, dtype=np.bool_)
    mine_mask = np.zeros(observation.shape, dtype=np.bool_)
    for row, column in symbolic_safe_cells:
        safe_mask[row, column] = True
    for row, column in symbolic_mine_cells:
        mine_mask[row, column] = True

    return LabeledState(
        seed=seed,
        step=step,
        observation=observation.copy(),
        action_mask=action_mask.copy(),
        mine_probabilities=probabilities,
        ground_truth_mines=ground_truth,
        symbolic_safe_mask=safe_mask,
        symbolic_mine_mask=mine_mask,
    )


def _next_action(
    *,
    board: MinesweeperBoard,
    action_mask: np.ndarray,
    probabilities: dict[tuple[int, int], float],
    safe_cells: frozenset[tuple[int, int]],
) -> int:
    valid_actions = np.flatnonzero(action_mask).tolist()
    safe_actions = sorted(
        row * board.columns + column
        for row, column in safe_cells
        if action_mask[row * board.columns + column]
    )
    if safe_actions:
        return safe_actions[0]
    if probabilities:
        return min(
            valid_actions,
            key=lambda action: (
                probabilities.get(divmod(action, board.columns), float("inf")),
                action,
            ),
        )
    return int(valid_actions[0])
