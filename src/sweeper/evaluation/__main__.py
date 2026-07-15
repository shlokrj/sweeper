"""Run reproducible shared-seed comparisons for every current Sweeper agent."""

from __future__ import annotations

import argparse
import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

from sweeper.agents import (
    Agent,
    ExactAgent,
    HybridAgent,
    LocalRiskAgent,
    NeuralAgent,
    NeuralHybridAgent,
    RandomAgent,
    SymbolicAgent,
)
from sweeper.environment import MinesweeperEnv
from sweeper.evaluation.benchmark import BenchmarkResult, evaluate_agent


def main() -> None:
    """Compare agents on a seed range that was held out from training data."""

    parser = argparse.ArgumentParser(description="benchmark Sweeper agents on shared board seeds")
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--rows", type=int, default=9)
    parser.add_argument("--columns", type=int, default=9)
    parser.add_argument("--mines", type=int, default=10)
    parser.add_argument("--games", type=int, default=500)
    parser.add_argument("--seed-start", type=int, default=20_000)
    parser.add_argument("--max-component-size", type=int, default=18)
    parser.add_argument("--device")
    arguments = parser.parse_args()
    if arguments.games <= 0:
        raise ValueError("games must be positive")

    seeds = tuple(range(arguments.seed_start, arguments.seed_start + arguments.games))
    environment_factory = _environment_factory(arguments.rows, arguments.columns, arguments.mines)
    agents = _agents(
        checkpoint=arguments.checkpoint,
        random_seed=arguments.seed_start,
        max_component_size=arguments.max_component_size,
        device=arguments.device,
    )
    results = {
        name: evaluate_agent(agent, environment_factory, seeds) for name, agent in agents.items()
    }
    report = {
        "configuration": {
            "rows": arguments.rows,
            "columns": arguments.columns,
            "mines": arguments.mines,
            "seed_start": arguments.seed_start,
            "games": arguments.games,
            "max_component_size": arguments.max_component_size,
            "checkpoint": str(arguments.checkpoint),
        },
        "seeds": list(seeds),
        "agents": {name: _report_result(result) for name, result in results.items()},
    }
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for name, result in results.items():
        print(
            f"{name}: win_rate={result.win_rate:.1%} loss_rate={result.loss_rate:.1%} "
            f"average_steps={result.average_steps:.1f} "
            f"decision_time_ms={result.average_decision_time_ms:.2f}"
        )
    print(f"wrote benchmark report to {arguments.output}")


def _environment_factory(rows: int, columns: int, mines: int) -> Callable[[], MinesweeperEnv]:
    return lambda: MinesweeperEnv(rows=rows, columns=columns, mine_count=mines)


def _agents(
    *,
    checkpoint: Path,
    random_seed: int,
    max_component_size: int,
    device: str | None,
) -> dict[str, Agent]:
    return {
        "random": RandomAgent(seed=random_seed),
        "local_heuristic": LocalRiskAgent(),
        "symbolic": SymbolicAgent(),
        "exact": ExactAgent(max_component_size=max_component_size),
        "hybrid": HybridAgent(max_component_size=max_component_size),
        "neural": NeuralAgent(checkpoint, device=device),
        "neural_hybrid": NeuralHybridAgent(
            checkpoint,
            max_component_size=max_component_size,
            device=device,
        ),
    }


def _report_result(result: BenchmarkResult) -> dict[str, Any]:
    return {
        "win_rate": result.win_rate,
        "loss_rate": result.loss_rate,
        "average_steps": result.average_steps,
        "average_decision_time_ms": result.average_decision_time_ms,
        "games": [
            {
                "seed": game.seed,
                "status": game.status.value,
                "steps": game.steps,
                "total_reward": game.total_reward,
                "actions": list(game.actions),
                "decision_time_ms": game.decision_time_ms,
            }
            for game in result.games
        ],
    }


if __name__ == "__main__":
    main()
