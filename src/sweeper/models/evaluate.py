"""Evaluate probability calibration on seed-disjoint validation states."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader, Subset

from sweeper.models.calibration import calibration_report
from sweeper.models.cnn import MineProbabilityCNN
from sweeper.models.strategy import STRATEGY_FEATURE_CHANNELS, encode_strategy_features
from sweeper.models.train import (
    LabeledStateDataset,
    StrategyLabeledStateDataset,
    _split_seed_indices,
    _training_device,
)


def main() -> None:
    """Write calibration metrics for a checkpoint on held-out board seeds."""

    parser = argparse.ArgumentParser(description="report Minesweeper model calibration")
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--mine-count", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=1024)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--bins", type=int, default=10)
    arguments = parser.parse_args()

    device = _training_device()
    payload = torch.load(arguments.checkpoint, map_location="cpu", weights_only=True)
    if not isinstance(payload, dict) or "model_state" not in payload:
        raise ValueError("checkpoint must contain a model_state mapping")
    extra_channels = int(payload.get("extra_channels", 0))
    if extra_channels not in {0, STRATEGY_FEATURE_CHANNELS}:
        raise ValueError("checkpoint uses unsupported extra feature channels")

    dataset = (
        StrategyLabeledStateDataset(arguments.dataset)
        if extra_channels
        else LabeledStateDataset(arguments.dataset)
    )
    _, validation_indices = _split_seed_indices(dataset.seeds, arguments.seed)
    loader = DataLoader(Subset(dataset, validation_indices), batch_size=arguments.batch_size)
    model = MineProbabilityCNN(
        width=int(payload.get("width", 64)),
        residual_blocks=int(payload.get("residual_blocks", 4)),
        extra_channels=extra_channels,
    ).to(device)
    model.load_state_dict(payload["model_state"])
    model.eval()

    predictions: list[np.ndarray] = []
    targets: list[np.ndarray] = []
    with torch.inference_mode():
        for batch in loader:
            observation, target, mask, *strategy_masks = batch
            observation, target, mask = observation.to(device), target.to(device), mask.to(device)
            extra_features = None
            if extra_channels:
                safe_mask, mine_mask = (tensor.to(device) for tensor in strategy_masks)
                flagged_count = (observation == -2).flatten(1).sum(dim=1)
                remaining_mines = (
                    torch.full_like(flagged_count, arguments.mine_count) - flagged_count
                )
                extra_features = encode_strategy_features(
                    observation,
                    safe_mask,
                    mine_mask,
                    remaining_mines,
                )
            probability = torch.sigmoid(model(observation, extra_features))
            valid = mask.bool()
            predictions.append(probability[valid].cpu().numpy())
            targets.append(target[valid].cpu().numpy())

    report = calibration_report(
        np.concatenate(predictions), np.concatenate(targets), bin_count=arguments.bins
    )
    output = {
        "checkpoint": str(arguments.checkpoint),
        "dataset": str(arguments.dataset),
        "validation_seed": arguments.seed,
        "validation_board_count": len(set(dataset.seeds[validation_indices].tolist())),
        "extra_channels": extra_channels,
        "metrics": report.as_dict(),
    }
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(
        f"brier_score={report.brier_score:.5f} "
        f"mean_absolute_error={report.mean_absolute_error:.5f} "
        f"expected_calibration_error={report.expected_calibration_error:.5f}"
    )
    print(f"wrote calibration report to {arguments.output}")


if __name__ == "__main__":
    main()
