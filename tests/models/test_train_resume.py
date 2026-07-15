from pathlib import Path

import pytest
import torch

from sweeper.models.cnn import MineProbabilityCNN
from sweeper.models.train import _restore_checkpoint


def test_restore_checkpoint_loads_legacy_weights_at_a_given_epoch(tmp_path: Path) -> None:
    original = MineProbabilityCNN(width=4, residual_blocks=1)
    checkpoint = tmp_path / "legacy.pt"
    torch.save(
        {
            "model_state": original.state_dict(),
            "width": 4,
            "residual_blocks": 1,
            "validation_loss": 0.25,
        },
        checkpoint,
    )

    restored = MineProbabilityCNN(width=4, residual_blocks=1)
    optimizer = torch.optim.AdamW(restored.parameters(), lr=3e-4)

    with pytest.raises(ValueError, match="--resume-epoch"):
        _restore_checkpoint(
            restored,
            optimizer,
            checkpoint,
            expected_extra_channels=0,
            resume_epoch=None,
            device=torch.device("cpu"),
        )

    completed_epoch, best_loss, best_state = _restore_checkpoint(
        restored,
        optimizer,
        checkpoint,
        expected_extra_channels=0,
        resume_epoch=28,
        device=torch.device("cpu"),
    )

    assert completed_epoch == 28
    assert best_loss == pytest.approx(0.25)
    assert best_state.keys() == original.state_dict().keys()
    for name, parameter in restored.state_dict().items():
        assert torch.equal(parameter, original.state_dict()[name])
