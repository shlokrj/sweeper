"""Combine paired experiment artifacts without copying per-game traces."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

_AGENT_METRICS = (
    "win_rate",
    "loss_rate",
    "average_steps",
    "average_decision_time_ms",
)
_CALIBRATION_METRICS = (
    "brier_score",
    "mean_absolute_error",
    "expected_calibration_error",
)
_CONFIGURATION_KEYS = (
    "rows",
    "columns",
    "mines",
    "games",
    "seed_start",
    "max_component_size",
)


@dataclass(frozen=True)
class RunSource:
    """Artifact paths for one model in a shared preset study."""

    label: str
    benchmark_path: Path
    calibration_path: Path


def build_preset_summary(preset: str, sources: tuple[RunSource, ...]) -> dict[str, Any]:
    """Return a compact summary after checking comparable benchmark inputs."""

    if not preset:
        raise ValueError("preset must not be empty")
    if not sources:
        raise ValueError("at least one run source is required")

    reference_configuration: dict[str, Any] | None = None
    reference_seeds: list[Any] | None = None
    runs: list[dict[str, Any]] = []
    for source in sources:
        benchmark = _read_report(source.benchmark_path)
        calibration = _read_report(source.calibration_path)
        configuration = _shared_benchmark_configuration(benchmark)
        seeds = _benchmark_seeds(benchmark)
        if reference_configuration is None:
            reference_configuration = configuration
            reference_seeds = seeds
        elif configuration != reference_configuration or seeds != reference_seeds:
            raise ValueError("benchmark reports must use the same configuration and seed list")
        runs.append(_summarize_run(source, benchmark, calibration))

    return {
        "preset": preset,
        "configuration": reference_configuration,
        "runs": runs,
    }


def write_preset_summary(path: Path, summary: dict[str, Any]) -> None:
    """Write one deterministic JSON document for later consumers."""

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")


def _summarize_run(
    source: RunSource,
    benchmark: dict[str, Any],
    calibration: dict[str, Any],
) -> dict[str, Any]:
    benchmark_configuration = _benchmark_configuration(benchmark)
    calibration_checkpoint = calibration.get("checkpoint")
    if calibration_checkpoint != benchmark_configuration["checkpoint"]:
        raise ValueError(f"{source.label} calibration checkpoint does not match benchmark")
    agents = benchmark.get("agents")
    if not isinstance(agents, dict):
        raise ValueError(f"{source.label} benchmark report has no agents mapping")
    metrics = calibration.get("metrics")
    if not isinstance(metrics, dict):
        raise ValueError(f"{source.label} calibration report has no metrics mapping")

    return {
        "label": source.label,
        "checkpoint": benchmark_configuration["checkpoint"],
        "agents": {
            name: _select_metrics(result, _AGENT_METRICS, f"{source.label} agent {name}")
            for name, result in agents.items()
        },
        "calibration": _select_metrics(metrics, _CALIBRATION_METRICS, source.label),
    }


def _benchmark_configuration(report: dict[str, Any]) -> dict[str, Any]:
    configuration = report.get("configuration")
    if not isinstance(configuration, dict):
        raise ValueError("benchmark report has no configuration mapping")
    required = (*_CONFIGURATION_KEYS, "checkpoint")
    return _select_metrics(configuration, required, "benchmark configuration")


def _shared_benchmark_configuration(report: dict[str, Any]) -> dict[str, Any]:
    configuration = report.get("configuration")
    if not isinstance(configuration, dict):
        raise ValueError("benchmark report has no configuration mapping")
    return _select_metrics(configuration, _CONFIGURATION_KEYS, "benchmark configuration")


def _benchmark_seeds(report: dict[str, Any]) -> list[Any]:
    seeds = report.get("seeds")
    if not isinstance(seeds, list):
        raise ValueError("benchmark report has no seed list")
    return seeds


def _select_metrics(values: dict[str, Any], keys: tuple[str, ...], label: str) -> dict[str, Any]:
    missing = [key for key in keys if key not in values]
    if missing:
        raise ValueError(f"{label} is missing {', '.join(missing)}")
    return {key: values[key] for key in keys}


def _read_report(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path} does not contain an object")
    return payload
