import json

import pytest

from sweeper.reporting import RunSource, build_preset_summary


def test_summary_keeps_compact_metrics_and_shared_configuration(tmp_path) -> None:
    control_benchmark = tmp_path / "control-benchmark.json"
    control_calibration = tmp_path / "control-calibration.json"
    strategy_benchmark = tmp_path / "strategy-benchmark.json"
    strategy_calibration = tmp_path / "strategy-calibration.json"
    _write_benchmark(control_benchmark, "control.pt")
    _write_calibration(control_calibration, "control.pt", 0.002)
    _write_benchmark(strategy_benchmark, "strategy.pt")
    _write_calibration(strategy_calibration, "strategy.pt", 0.001)

    summary = build_preset_summary(
        "expert",
        (
            RunSource("control", control_benchmark, control_calibration),
            RunSource("strategy", strategy_benchmark, strategy_calibration),
        ),
    )

    assert summary["preset"] == "expert"
    assert summary["configuration"]["rows"] == 16
    assert summary["runs"][1]["agents"]["neural_hybrid"]["win_rate"] == 0.41
    assert summary["runs"][0]["calibration"]["brier_score"] == 0.002
    assert "games" not in summary["runs"][0]["agents"]["neural"]


def test_summary_rejects_mismatched_shared_seed_reports(tmp_path) -> None:
    benchmark = tmp_path / "benchmark.json"
    calibration = tmp_path / "calibration.json"
    incompatible = tmp_path / "incompatible.json"
    _write_benchmark(benchmark, "control.pt")
    _write_calibration(calibration, "control.pt", 0.002)
    _write_benchmark(incompatible, "strategy.pt", seeds=[121000, 121001])

    with pytest.raises(ValueError, match="same configuration and seed list"):
        build_preset_summary(
            "expert",
            (
                RunSource("control", benchmark, calibration),
                RunSource("strategy", incompatible, calibration),
            ),
        )


def _write_benchmark(path, checkpoint: str, seeds: list[int] | None = None) -> None:
    path.write_text(
        json.dumps(
            {
                "configuration": {
                    "rows": 16,
                    "columns": 30,
                    "mines": 99,
                    "games": 2,
                    "seed_start": 120000,
                    "max_component_size": 18,
                    "checkpoint": checkpoint,
                },
                "seeds": seeds or [120000, 120001],
                "agents": {
                    "neural": _agent_metrics(0.35),
                    "neural_hybrid": _agent_metrics(0.41),
                },
            }
        ),
        encoding="utf-8",
    )


def _write_calibration(path, checkpoint: str, brier_score: float) -> None:
    path.write_text(
        json.dumps(
            {
                "checkpoint": checkpoint,
                "metrics": {
                    "brier_score": brier_score,
                    "mean_absolute_error": 0.01,
                    "expected_calibration_error": 0.02,
                },
            }
        ),
        encoding="utf-8",
    )


def _agent_metrics(win_rate: float) -> dict[str, float | list[object]]:
    return {
        "win_rate": win_rate,
        "loss_rate": 1 - win_rate,
        "average_steps": 50.0,
        "average_decision_time_ms": 8.0,
        "games": [],
    }
