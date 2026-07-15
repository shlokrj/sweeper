"""A compact CNN that predicts a mine probability logit for each board cell."""

from __future__ import annotations

import torch
from torch import nn
from torch.nn import functional as functional

CELL_STATE_CHANNELS = 11


def encode_visible_state(observation: torch.Tensor) -> torch.Tensor:
    """One-hot encode visible values from ``-2`` through ``8`` into CNN channels."""

    if observation.ndim != 3:
        raise ValueError("observation must have shape [batch, rows, columns]")
    encoded = observation.to(dtype=torch.long) + 2
    if torch.any(encoded < 0) or torch.any(encoded >= CELL_STATE_CHANNELS):
        raise ValueError("observation values must be in the visible-cell range -2 through 8")
    return functional.one_hot(encoded, num_classes=CELL_STATE_CHANNELS).permute(0, 3, 1, 2).float()


class _ResidualBlock(nn.Module):
    def __init__(self, width: int) -> None:
        super().__init__()
        self.layers = nn.Sequential(
            nn.Conv2d(width, width, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv2d(width, width, kernel_size=3, padding=1),
        )

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        return torch.relu(features + self.layers(features))


class MineProbabilityCNN(nn.Module):
    """Predict one mine logit per cell from a visible Minesweeper board."""

    def __init__(self, *, width: int = 64, residual_blocks: int = 4) -> None:
        super().__init__()
        if width <= 0 or residual_blocks <= 0:
            raise ValueError("width and residual_blocks must be positive")
        self.stem = nn.Sequential(
            nn.Conv2d(CELL_STATE_CHANNELS, width, kernel_size=3, padding=1),
            nn.ReLU(),
        )
        self.blocks = nn.Sequential(*(_ResidualBlock(width) for _ in range(residual_blocks)))
        self.head = nn.Conv2d(width, 1, kernel_size=1)

    def forward(self, observation: torch.Tensor) -> torch.Tensor:
        """Return mine logits with shape ``[batch, rows, columns]``."""

        features = self.blocks(self.stem(encode_visible_state(observation)))
        return self.head(features).squeeze(1)
