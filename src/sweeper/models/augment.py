"""Label-preserving square-board augmentations for Minesweeper training data."""

from __future__ import annotations

import torch
from torch.utils.data import Dataset


class RandomSquareSymmetryDataset(Dataset[tuple[torch.Tensor, torch.Tensor, torch.Tensor]]):
    """Apply one random rotation or reflection to every sampled square board."""

    def __init__(self, dataset: Dataset[tuple[torch.Tensor, torch.Tensor, torch.Tensor]]) -> None:
        if not len(dataset):
            raise ValueError("dataset must contain at least one state")
        observation, _, _ = dataset[0]
        if observation.ndim != 2 or observation.shape[0] != observation.shape[1]:
            raise ValueError(
                "square-board symmetry augmentation requires two-dimensional square states"
            )
        self._dataset = dataset

    def __len__(self) -> int:
        return len(self._dataset)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        observation, targets, mask = self._dataset[index]
        symmetry = int(torch.randint(8, ()).item())
        return tuple(
            _apply_square_symmetry(tensor, symmetry) for tensor in (observation, targets, mask)
        )  # type: ignore[return-value]


def _apply_square_symmetry(tensor: torch.Tensor, symmetry: int) -> torch.Tensor:
    """Apply one of the eight dihedral symmetries while preserving board meaning."""

    if not 0 <= symmetry < 8:
        raise ValueError("symmetry must be in the range 0 through 7")
    rotated = torch.rot90(tensor, symmetry % 4, dims=(-2, -1))
    return torch.flip(rotated, dims=(-1,)) if symmetry >= 4 else rotated
