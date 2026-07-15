"""Reproducible game-by-game agent evaluation."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from time import perf_counter

from sweeper.agents.base import Agent
from sweeper.environment import GameStatus, MinesweeperEnv


@dataclass(frozen=True)
class GameResult:
    """Metrics and replayable choices from one seeded evaluation game."""

    seed: int
    status: GameStatus
    steps: int
    total_reward: float
    actions: tuple[int, ...]
    decision_time_ms: float


@dataclass(frozen=True)
class BenchmarkResult:
    """Aggregate outcomes from evaluating one agent on shared board seeds."""

    games: tuple[GameResult, ...]

    @property
    def win_rate(self) -> float:
        return _rate(self.games, GameStatus.WON)

    @property
    def loss_rate(self) -> float:
        return _rate(self.games, GameStatus.LOST)

    @property
    def average_steps(self) -> float:
        return sum(game.steps for game in self.games) / len(self.games) if self.games else 0.0

    @property
    def average_decision_time_ms(self) -> float:
        return (
            sum(game.decision_time_ms for game in self.games) / len(self.games)
            if self.games
            else 0.0
        )


def evaluate_agent(
    agent: Agent,
    environment_factory: Callable[[], MinesweeperEnv],
    seeds: tuple[int, ...],
    *,
    max_steps: int | None = None,
) -> BenchmarkResult:
    """Evaluate an agent on identical seeded environments and retain every action."""

    games: list[GameResult] = []
    for seed in seeds:
        environment = environment_factory()
        observation, info = environment.reset(seed=seed)
        actions: list[int] = []
        total_reward = 0.0
        decision_time = 0.0
        terminated = False
        truncated = False

        while not terminated and not truncated:
            if max_steps is not None and len(actions) >= max_steps:
                truncated = True
                break

            started = perf_counter()
            decision = agent.select_action(observation, info)
            decision_time += perf_counter() - started
            observation, reward, terminated, environment_truncated, info = environment.step(
                decision.action
            )
            actions.append(decision.action)
            total_reward += reward
            truncated = truncated or environment_truncated

        games.append(
            GameResult(
                seed=seed,
                status=GameStatus(info["status"]),
                steps=len(actions),
                total_reward=total_reward,
                actions=tuple(actions),
                decision_time_ms=decision_time * 1_000,
            )
        )

    return BenchmarkResult(tuple(games))


def _rate(games: tuple[GameResult, ...], status: GameStatus) -> float:
    return sum(game.status is status for game in games) / len(games) if games else 0.0
