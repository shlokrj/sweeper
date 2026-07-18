"""Create one compact summary from paired benchmark and calibration reports."""

from __future__ import annotations

import argparse
from pathlib import Path

from sweeper.reporting.summary import RunSource, build_preset_summary, write_preset_summary


def main() -> None:
    """Write a stable preset summary for documentation and presentation layers."""

    parser = argparse.ArgumentParser(description="summarize Sweeper experiment artifacts")
    parser.add_argument("--preset", required=True)
    parser.add_argument("--label", action="append", required=True)
    parser.add_argument("--benchmark", action="append", type=Path, required=True)
    parser.add_argument("--calibration", action="append", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    if not (
        len(arguments.label)
        == len(arguments.benchmark)
        == len(arguments.calibration)
    ):
        raise ValueError("--label, --benchmark, and --calibration must have matching counts")

    sources = tuple(
        RunSource(label, benchmark, calibration)
        for label, benchmark, calibration in zip(
            arguments.label, arguments.benchmark, arguments.calibration, strict=True
        )
    )
    write_preset_summary(arguments.output, build_preset_summary(arguments.preset, sources))
    print(f"wrote preset summary to {arguments.output}")


if __name__ == "__main__":
    main()
