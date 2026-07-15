import json
import sys
from pathlib import Path

import pytest

torch = pytest.importorskip("torch")

from sweeper.evaluation import __main__ as benchmark_cli  # noqa: E402
from sweeper.models import MineProbabilityCNN  # noqa: E402


def test_benchmark_cli_writes_one_shared_seed_report(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    checkpoint = tmp_path / "cnn.pt"
    output = tmp_path / "report.json"
    model = MineProbabilityCNN(width=4, residual_blocks=1)
    torch.save({"model_state": model.state_dict(), "width": 4, "residual_blocks": 1}, checkpoint)
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "sweeper.evaluation",
            "--checkpoint",
            str(checkpoint),
            "--output",
            str(output),
            "--rows",
            "2",
            "--columns",
            "2",
            "--mines",
            "0",
            "--games",
            "2",
            "--seed-start",
            "23",
            "--device",
            "cpu",
        ],
    )

    benchmark_cli.main()

    report = json.loads(output.read_text(encoding="utf-8"))
    assert report["seeds"] == [23, 24]
    assert set(report["agents"]) == {
        "random",
        "local_heuristic",
        "symbolic",
        "exact",
        "hybrid",
        "neural",
        "neural_hybrid",
    }
    assert all(len(result["games"]) == 2 for result in report["agents"].values())
