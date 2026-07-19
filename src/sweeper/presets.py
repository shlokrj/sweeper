"""Map supported board presets to the checkpoints chosen by held-out studies."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path


class ModelPurpose(StrEnum):
    """Choose whether a model is optimizing play or calibrated risk estimates."""

    AUTOPLAY = "autoplay"
    ASSISTED = "assisted"


@dataclass(frozen=True)
class PresetPolicy:
    """The measured model choice for one fixed Minesweeper board configuration."""

    name: str
    rows: int
    columns: int
    mines: int
    autoplay_checkpoint: Path
    assisted_checkpoint: Path
    max_component_size: int = 18

    def checkpoint_for(self, purpose: ModelPurpose | str = ModelPurpose.AUTOPLAY) -> Path:
        """Return the selected checkpoint for a play mode."""

        selected_purpose = ModelPurpose(purpose)
        if selected_purpose is ModelPurpose.AUTOPLAY:
            return self.autoplay_checkpoint
        if selected_purpose is ModelPurpose.ASSISTED:
            return self.assisted_checkpoint
        raise AssertionError(f"unhandled model purpose: {selected_purpose}")


_PRESET_POLICIES = (
    PresetPolicy(
        name="beginner",
        rows=9,
        columns=9,
        mines=10,
        autoplay_checkpoint=Path("artifacts/cnn-strategy.pt"),
        assisted_checkpoint=Path("artifacts/cnn-strategy.pt"),
    ),
    PresetPolicy(
        name="intermediate",
        rows=16,
        columns=16,
        mines=40,
        autoplay_checkpoint=Path("artifacts/cnn-intermediate-strategy.pt"),
        assisted_checkpoint=Path("artifacts/cnn-intermediate-strategy.pt"),
    ),
    PresetPolicy(
        name="expert",
        rows=16,
        columns=30,
        mines=99,
        autoplay_checkpoint=Path("artifacts/cnn-expert-control.pt"),
        assisted_checkpoint=Path("artifacts/cnn-expert-strategy.pt"),
    ),
)


def preset_for_board(rows: int, columns: int, mines: int) -> PresetPolicy:
    """Return the studied policy for an exact board shape and mine count.

    Refusing an unstudied configuration prevents a default checkpoint from being
    presented as evidence for a board it was not evaluated on.
    """

    for policy in _PRESET_POLICIES:
        if (policy.rows, policy.columns, policy.mines) == (rows, columns, mines):
            return policy
    raise ValueError(
        f"no measured model policy for a {rows}x{columns} board with {mines} mines"
    )


def preset_policies() -> tuple[PresetPolicy, ...]:
    """Return every board configuration with a measured checkpoint policy."""

    return _PRESET_POLICIES
