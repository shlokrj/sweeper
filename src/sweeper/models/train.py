"""Train the CNN against exact mine-probability labels stored in an NPZ archive."""

from __future__ import annotations

import argparse
from copy import deepcopy
from pathlib import Path

import numpy as np
import torch
from torch.nn import functional as functional
from torch.utils.data import DataLoader, Dataset, Subset

from sweeper.models.augment import RandomSquareSymmetryDataset
from sweeper.models.cnn import MineProbabilityCNN
from sweeper.models.strategy import STRATEGY_FEATURE_CHANNELS, encode_strategy_features


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


class StrategyLabeledStateDataset(Dataset[tuple[torch.Tensor, ...]]):
    """Load labels and symbolic deductions for a strategy-aware probability model."""

    def __init__(self, path: Path) -> None:
        self._states = LabeledStateDataset(path)
        with np.load(path) as archive:
            self.symbolic_safe_masks = archive["symbolic_safe_masks"].copy()
            self.symbolic_mine_masks = archive["symbolic_mine_masks"].copy()
        self.seeds = self._states.seeds

    def __len__(self) -> int:
        return len(self._states)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, ...]:
        observation, targets, target_mask = self._states[index]
        return (
            observation,
            targets,
            target_mask,
            torch.from_numpy(self.symbolic_safe_masks[index]),
            torch.from_numpy(self.symbolic_mine_masks[index]),
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
    parser.add_argument("--mine-count", type=int, default=10)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--augment-symmetries", action="store_true")
    parser.add_argument("--strategy-features", action="store_true")
    parser.add_argument("--resume", type=Path)
    parser.add_argument("--resume-epoch", type=int)
    arguments = parser.parse_args()

    torch.manual_seed(arguments.seed)
    dataset: LabeledStateDataset | StrategyLabeledStateDataset
    dataset = (
        StrategyLabeledStateDataset(arguments.dataset)
        if arguments.strategy_features
        else LabeledStateDataset(arguments.dataset)
    )
    train_indices, validation_indices = _split_seed_indices(dataset.seeds, arguments.seed)
    train_dataset: Dataset[tuple[torch.Tensor, ...]] = Subset(dataset, train_indices)
    if arguments.augment_symmetries:
        train_dataset = RandomSquareSymmetryDataset(train_dataset)
    train_loader = DataLoader(train_dataset, batch_size=arguments.batch_size, shuffle=True)
    validation_loader = DataLoader(
        Subset(dataset, validation_indices), batch_size=arguments.batch_size
    )
    device = _training_device()
    extra_channels = STRATEGY_FEATURE_CHANNELS if arguments.strategy_features else 0
    model = MineProbabilityCNN(
        width=arguments.width,
        residual_blocks=arguments.residual_blocks,
        extra_channels=extra_channels,
    ).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=arguments.learning_rate)

    best_validation_loss = float("inf")
    best_model_state = deepcopy(model.state_dict())
    start_epoch = 0
    if arguments.resume is not None:
        start_epoch, best_validation_loss, best_model_state = _restore_checkpoint(
            model,
            optimizer,
            arguments.resume,
            expected_extra_channels=extra_channels,
            resume_epoch=arguments.resume_epoch,
            device=device,
        )
        print(f"resuming from epoch {start_epoch:03d} using {arguments.resume}")

    for epoch in range(start_epoch + 1, arguments.epochs + 1):
        training_loss = _run_epoch(
            model,
            train_loader,
            optimizer,
            device,
            strategy_features=arguments.strategy_features,
            mine_count=arguments.mine_count,
        )
        validation_loss = _run_epoch(
            model,
            validation_loader,
            None,
            device,
            strategy_features=arguments.strategy_features,
            mine_count=arguments.mine_count,
        )
        print(
            f"epoch {epoch:03d} train_loss={training_loss:.5f} "
            f"validation_loss={validation_loss:.5f} device={device.type}"
        )
        if validation_loss < best_validation_loss:
            best_validation_loss = validation_loss
            best_model_state = deepcopy(model.state_dict())
        _save_checkpoint(
            path=arguments.checkpoint,
            best_model_state=best_model_state,
            model=model,
            optimizer=optimizer,
            width=arguments.width,
            residual_blocks=arguments.residual_blocks,
            extra_channels=extra_channels,
            mine_count=arguments.mine_count,
            completed_epoch=epoch,
            best_validation_loss=best_validation_loss,
            last_validation_loss=validation_loss,
        )


def _restore_checkpoint(
    model: MineProbabilityCNN,
    optimizer: torch.optim.Optimizer,
    path: Path,
    *,
    expected_extra_channels: int,
    resume_epoch: int | None,
    device: torch.device,
) -> tuple[int, float, dict[str, torch.Tensor]]:
    payload = torch.load(path, map_location="cpu", weights_only=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("model_state"), dict):
        raise ValueError("resume checkpoint must contain a model_state mapping")
    if int(payload.get("extra_channels", 0)) != expected_extra_channels:
        raise ValueError("resume checkpoint uses incompatible extra feature channels")

    completed_epoch = payload.get("completed_epoch")
    if completed_epoch is None:
        if resume_epoch is None:
            raise ValueError("legacy checkpoints require --resume-epoch")
        completed_epoch = resume_epoch
    elif resume_epoch is not None and int(completed_epoch) != resume_epoch:
        raise ValueError("--resume-epoch does not match the checkpoint")
    if int(completed_epoch) < 0:
        raise ValueError("resume epoch must be non-negative")

    last_model_state = payload.get("last_model_state", payload["model_state"])
    if not isinstance(last_model_state, dict):
        raise ValueError("resume checkpoint contains an invalid last_model_state")
    model.load_state_dict(last_model_state)
    optimizer_state = payload.get("optimizer_state")
    if isinstance(optimizer_state, dict):
        optimizer.load_state_dict(optimizer_state)
        _move_optimizer_state(optimizer, device)

    best_model_state = deepcopy(payload["model_state"])
    best_validation_loss = float(
        payload.get("best_validation_loss", payload.get("validation_loss", float("inf")))
    )
    return int(completed_epoch), best_validation_loss, best_model_state


def _save_checkpoint(
    *,
    path: Path,
    best_model_state: dict[str, torch.Tensor],
    model: MineProbabilityCNN,
    optimizer: torch.optim.Optimizer,
    width: int,
    residual_blocks: int,
    extra_channels: int,
    mine_count: int,
    completed_epoch: int,
    best_validation_loss: float,
    last_validation_loss: float,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "model_state": best_model_state,
            "last_model_state": model.state_dict(),
            "optimizer_state": optimizer.state_dict(),
            "width": width,
            "residual_blocks": residual_blocks,
            "extra_channels": extra_channels,
            "mine_count": mine_count,
            "completed_epoch": completed_epoch,
            "validation_loss": best_validation_loss,
            "best_validation_loss": best_validation_loss,
            "last_validation_loss": last_validation_loss,
        },
        path,
    )


def _move_optimizer_state(optimizer: torch.optim.Optimizer, device: torch.device) -> None:
    for state in optimizer.state.values():
        for key, value in state.items():
            if isinstance(value, torch.Tensor):
                state[key] = value.to(device)


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
    loader: DataLoader,
    optimizer: torch.optim.Optimizer | None,
    device: torch.device,
    *,
    strategy_features: bool,
    mine_count: int,
) -> float:
    training = optimizer is not None
    model.train(training)
    total_loss = 0.0
    total_cells = 0.0
    for batch in loader:
        observation, targets, mask, *strategy_masks = batch
        observation, targets, mask = observation.to(device), targets.to(device), mask.to(device)
        extra_features = None
        if strategy_features:
            safe_mask, mine_mask = (tensor.to(device) for tensor in strategy_masks)
            flagged_count = (observation == -2).flatten(1).sum(dim=1)
            remaining_mines = torch.full_like(flagged_count, mine_count) - flagged_count
            extra_features = encode_strategy_features(
                observation,
                safe_mask,
                mine_mask,
                remaining_mines,
            )
        with torch.set_grad_enabled(training):
            logits = model(observation, extra_features)
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
