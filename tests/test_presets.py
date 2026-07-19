from pathlib import Path

import pytest

from sweeper.presets import ModelPurpose, preset_for_board, preset_policies


def test_each_supported_preset_selects_its_measured_autoplay_checkpoint() -> None:
    selected = {
        policy.name: policy.checkpoint_for()
        for policy in (
            preset_for_board(9, 9, 10),
            preset_for_board(16, 16, 40),
            preset_for_board(16, 30, 99),
        )
    }

    assert selected == {
        "beginner": Path("artifacts/cnn-strategy.pt"),
        "intermediate": Path("artifacts/cnn-intermediate-strategy.pt"),
        "expert": Path("artifacts/cnn-expert-control.pt"),
    }


def test_expert_assist_prefers_the_better_calibrated_strategy_checkpoint() -> None:
    policy = preset_for_board(16, 30, 99)

    assert policy.checkpoint_for("assisted") == Path(
        "artifacts/cnn-expert-strategy.pt"
    )
    assert policy.checkpoint_for(ModelPurpose.AUTOPLAY) != policy.checkpoint_for(
        ModelPurpose.ASSISTED
    )


def test_unstudied_board_configuration_is_rejected() -> None:
    with pytest.raises(ValueError, match="no measured model policy"):
        preset_for_board(16, 30, 98)


def test_policy_list_is_complete_and_immutable() -> None:
    policies = preset_policies()

    assert tuple(policy.name for policy in policies) == ("beginner", "intermediate", "expert")
    assert len(policies) == 3
