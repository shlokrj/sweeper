import pytest

torch = pytest.importorskip("torch")

from sweeper.models import (  # noqa: E402
    STRATEGY_FEATURE_CHANNELS,
    MineProbabilityCNN,
    encode_strategy_features,
    encode_visible_state,
)


def test_cnn_encodes_visible_cells_and_returns_one_logit_per_cell() -> None:
    observation = torch.tensor([[[[-2, -1], [0, 8]]]], dtype=torch.int8).squeeze(1)

    encoded = encode_visible_state(observation)
    logits = MineProbabilityCNN(width=8, residual_blocks=1)(observation)

    assert encoded.shape == (1, 11, 2, 2)
    assert torch.all(encoded.sum(dim=1) == 1)
    assert logits.shape == (1, 2, 2)


def test_cnn_accepts_symbolic_masks_and_global_mine_density() -> None:
    observation = torch.tensor([[[-1, -1], [1, -1]]], dtype=torch.int8)
    safe_mask = torch.tensor([[[False, True], [False, False]]])
    mine_mask = torch.tensor([[[True, False], [False, False]]])
    features = encode_strategy_features(
        observation,
        safe_mask,
        mine_mask,
        torch.tensor([1]),
    )
    logits = MineProbabilityCNN(
        width=8,
        residual_blocks=1,
        extra_channels=STRATEGY_FEATURE_CHANNELS,
    )(observation, features)

    assert features.shape == (1, STRATEGY_FEATURE_CHANNELS, 2, 2)
    assert torch.equal(features[0, 0], safe_mask[0].float())
    assert torch.equal(features[0, 1], mine_mask[0].float())
    assert logits.shape == (1, 2, 2)
