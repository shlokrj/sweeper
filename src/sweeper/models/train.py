"""Train the CNN against exact mine-probability labels stored in an NPZ archive."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import torch
from torch.nn import functional as functional
from torch.utils.data import DataLoader, Dataset, Subset

from sweeper.models.augment import RandomSquareSymmetryDataset
from sweeper.models.cnn import MineProbabilityCNN


class LabeledStateDataset(Dataset[tuple[torch.Tensor, torch.Tensor, torch.Tensor]]):
    """Load model inputs, soft targets, and valid-cell masks from one NPZ archive."""

    def __init__(self, path: Path) -> None:
        with np.load(path) as archive:
            self.seeds = archive["seeds"].copy()
            self.observations = archive["observations"].copy()
            probabilities = archive["mine_probabilities"].copy()
        self.targets = np.nan_to_num(probabilities, nan=0.0).astype(np.float32)
        self.target_mask = np.isfinite(probabilities).astype(np.float32)

    def __len__(self) -> int:
        return len(self.observations)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        return (
            torch.from_numpy(self.observations[index]),
            torch.from_numpy(self.targets[index]),
            torch.from_numpy(self.target_mask[index]),
        )


def main() -> None:
    """Train a probability CNN with seed-disjoint validation states."""

    parser = argparse.ArgumentParser(description="train a Minesweeper probability CNN")
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--width", type=int, default=64)
    parser.add_argument("--residual-blocks", type=int, default=4)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--augment-symmetries", action="store_true")
    arguments = parser.parse_args()

    torch.manual_seed(arguments.seed)
    dataset = LabeledStateDataset(arguments.dataset)
    train_indices, validation_indices = _split_seed_indices(dataset.seeds, arguments.seed)
    train_dataset: Dataset[tuple[torch.Tensor, torch.Tensor, torch.Tensor]] = Subset(
        dataset, train_indices
    )
    if arguments.augment_symmetries:
        train_dataset = RandomSquareSymmetryDataset(train_dataset)
    train_loader = DataLoader(train_dataset, batch_size=arguments.batch_size, shuffle=True)
    validation_loader = DataLoader(
        Subset(dataset, validation_indices), batch_size=arguments.batch_size
    )
    device = _training_device()
    model = MineProbabilityCNN(width=arguments.width, residual_blocks=arguments.residual_blocks).to(
        device
    )
    optimizer = torch.optim.AdamW(model.parameters(), lr=arguments.learning_rate)

    best_validation_loss = float("inf")
    for epoch in range(1, arguments.epochs + 1):
        training_loss = _run_epoch(model, train_loader, optimizer, device)
        validation_loss = _run_epoch(model, validation_loader, None, device)
        print(
            f"epoch {epoch:03d} train_loss={training_loss:.5f} "
            f"validation_loss={validation_loss:.5f} device={device.type}"
        )
        if validation_loss < best_validation_loss:
            best_validation_loss = validation_loss
            arguments.checkpoint.parent.mkdir(parents=True, exist_ok=True)
            torch.save(
                {
                    "model_state": model.state_dict(),
                    "width": arguments.width,
                    "residual_blocks": arguments.residual_blocks,
                    "validation_loss": validation_loss,
                },
                arguments.checkpoint,
            )


def _split_seed_indices(seeds: np.ndarray, seed: int) -> tuple[list[int], list[int]]:
    unique_seeds = np.unique(seeds)
    if len(unique_seeds) < 2:
        raise ValueError("dataset must contain states from at least two board seeds")
    shuffled = np.random.default_rng(seed).permutation(unique_seeds)
    split = min(max(1, round(len(shuffled) * 0.8)), len(shuffled) - 1)
    train_seeds = set(shuffled[:split].tolist())
    train_indices = [index for index, board_seed in enumerate(seeds) if board_seed in train_seeds]
    validation_indices = [
        index for index, board_seed in enumerate(seeds) if board_seed not in train_seeds
    ]
    return train_indices, validation_indices


def _run_epoch(
    model: MineProbabilityCNN,
    loader: DataLoader[tuple[torch.Tensor, torch.Tensor, torch.Tensor]],
    optimizer: torch.optim.Optimizer | None,
    device: torch.device,
) -> float:
    training = optimizer is not None
    model.train(training)
    total_loss = 0.0
    total_cells = 0.0
    for observation, targets, mask in loader:
        observation, targets, mask = observation.to(device), targets.to(device), mask.to(device)
        with torch.set_grad_enabled(training):
            logits = model(observation)
            per_cell_loss = functional.binary_cross_entropy_with_logits(
                logits, targets, reduction="none"
            )
            loss = (per_cell_loss * mask).sum() / mask.sum().clamp_min(1.0)
        if optimizer is not None:
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        total_loss += float((per_cell_loss * mask).sum().item())
        total_cells += float(mask.sum().item())
    return total_loss / max(total_cells, 1.0)


def _training_device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


if __name__ == "__main__":
    main()
