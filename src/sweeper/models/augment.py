"""Label-preserving board augmentations for Minesweeper training data."""

from __future__ import annotations

import torch
from torch.utils.data import Dataset


class RandomBoardSymmetryDataset(Dataset[tuple[torch.Tensor, ...]]):
    """Apply one random shape-preserving symmetry to every sampled board."""

    def __init__(self, dataset: Dataset[tuple[torch.Tensor, ...]]) -> None:
        if not len(dataset):
            raise ValueError("dataset must contain at least one state")
        sample = dataset[0]
        if not sample:
            raise ValueError("dataset samples must include an observation tensor")
        observation = sample[0]
        if observation.ndim != 2:
            raise ValueError("board symmetry augmentation requires two-dimensional states")
        self._dataset = dataset
        self._square = observation.shape[0] == observation.shape[1]

    def __len__(self) -> int:
        return len(self._dataset)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, ...]:
        tensors = self._dataset[index]
        symmetry_count = 8 if self._square else 4
        symmetry = int(torch.randint(symmetry_count, ()).item())
        transform = _apply_square_symmetry if self._square else _apply_rectangular_symmetry
        return tuple(transform(tensor, symmetry) for tensor in tensors)


class RandomSquareSymmetryDataset(RandomBoardSymmetryDataset):
    """Retain the square-only augmentation contract for existing callers."""

    def __init__(self, dataset: Dataset[tuple[torch.Tensor, ...]]) -> None:
        super().__init__(dataset)
        if not self._square:
            raise ValueError("square-board symmetry augmentation requires square states")


def _apply_square_symmetry(tensor: torch.Tensor, symmetry: int) -> torch.Tensor:
    """Apply one of the eight dihedral symmetries while preserving board meaning."""

    if not 0 <= symmetry < 8:
        raise ValueError("symmetry must be in the range 0 through 7")
    rotated = torch.rot90(tensor, symmetry % 4, dims=(-2, -1))
    return torch.flip(rotated, dims=(-1,)) if symmetry >= 4 else rotated


def _apply_rectangular_symmetry(tensor: torch.Tensor, symmetry: int) -> torch.Tensor:
    """Apply one of four symmetries that preserve a rectangular board shape."""

    if not 0 <= symmetry < 4:
        raise ValueError("rectangular symmetry must be in the range 0 through 3")
    if symmetry == 0:
        return tensor
    if symmetry == 1:
        return torch.rot90(tensor, 2, dims=(-2, -1))
    return torch.flip(tensor, dims=(-1 if symmetry == 2 else -2,))
