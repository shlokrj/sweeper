"""Strategy features derived from visible constraints."""

from __future__ import annotations

import torch

STRATEGY_FEATURE_CHANNELS = 3


def encode_strategy_features(
    observation: torch.Tensor,
    symbolic_safe_mask: torch.Tensor,
    symbolic_mine_mask: torch.Tensor,
    remaining_mines: torch.Tensor,
) -> torch.Tensor:
    """Encode symbolic deductions and global mine density as CNN feature planes."""

    if observation.ndim != 3:
        raise ValueError("observation must have shape [batch, rows, columns]")
    if (
        symbolic_safe_mask.shape != observation.shape
        or symbolic_mine_mask.shape != observation.shape
    ):
        raise ValueError("symbolic masks must match the observation shape")
    if remaining_mines.shape != (observation.shape[0],):
        raise ValueError("remaining_mines must have shape [batch]")

    covered_count = (observation == -1).flatten(1).sum(dim=1).clamp_min(1)
    mine_density = (remaining_mines.float() / covered_count).view(-1, 1, 1)
    density_plane = mine_density.expand_as(observation).float()
    return torch.stack(
        (
            symbolic_safe_mask.float(),
            symbolic_mine_mask.float(),
            density_plane,
        ),
        dim=1,
    )
