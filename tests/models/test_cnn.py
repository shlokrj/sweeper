import pytest

torch = pytest.importorskip("torch")

from sweeper.models import MineProbabilityCNN, encode_visible_state  # noqa: E402


def test_cnn_encodes_visible_cells_and_returns_one_logit_per_cell() -> None:
    observation = torch.tensor([[[[-2, -1], [0, 8]]]], dtype=torch.int8).squeeze(1)

    encoded = encode_visible_state(observation)
    logits = MineProbabilityCNN(width=8, residual_blocks=1)(observation)

    assert encoded.shape == (1, 11, 2, 2)
    assert torch.all(encoded.sum(dim=1) == 1)
    assert logits.shape == (1, 2, 2)
