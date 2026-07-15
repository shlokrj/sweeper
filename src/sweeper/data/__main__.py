"""Command-line entry point for exact-labeled state generation."""

from __future__ import annotations

import argparse
from pathlib import Path

from sweeper.data.generate import GenerationConfig, generate_labeled_states, save_dataset


def main() -> None:
    """Generate one compressed supervised dataset from a deterministic seed range."""

    parser = argparse.ArgumentParser(description="generate exact-labeled Minesweeper states")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--rows", type=int, default=9)
    parser.add_argument("--columns", type=int, default=9)
    parser.add_argument("--mines", type=int, default=10)
    parser.add_argument("--games", type=int, default=20_000)
    parser.add_argument("--seed-start", type=int, default=0)
    parser.add_argument("--max-steps", type=int, default=200)
    parser.add_argument("--max-component-size", type=int, default=18)
    arguments = parser.parse_args()
    if arguments.games <= 0:
        raise ValueError("games must be positive")

    config = GenerationConfig(
        rows=arguments.rows,
        columns=arguments.columns,
        mine_count=arguments.mines,
        seeds=tuple(range(arguments.seed_start, arguments.seed_start + arguments.games)),
        max_steps_per_game=arguments.max_steps,
        max_component_size=arguments.max_component_size,
    )
    states = generate_labeled_states(config)
    save_dataset(arguments.output, states)
    print(f"wrote {len(states)} labeled states to {arguments.output}")


if __name__ == "__main__":
    main()
