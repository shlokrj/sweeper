import pytest

torch = pytest.importorskip("torch")
from torch.utils.data import TensorDataset  # noqa: E402

from sweeper.models.augment import RandomSquareSymmetryDataset, _apply_square_symmetry  # noqa: E402


def test_square_symmetries_keep_input_target_and_mask_cells_aligned() -> None:
    observation = torch.arange(9, dtype=torch.int8).reshape(3, 3)
    targets = observation.float() + 100
    mask = observation + 50

    for symmetry in range(8):
        transformed_observation = _apply_square_symmetry(observation, symmetry)
        transformed_targets = _apply_square_symmetry(targets, symmetry)
        transformed_mask = _apply_square_symmetry(mask, symmetry)

        assert torch.equal(transformed_targets, transformed_observation.float() + 100)
        assert torch.equal(transformed_mask, transformed_observation + 50)


def test_random_symmetry_dataset_rejects_rectangular_boards() -> None:
    dataset = TensorDataset(
        torch.zeros((1, 2, 3), dtype=torch.int8),
        torch.zeros((1, 2, 3)),
        torch.ones((1, 2, 3)),
    )

    with pytest.raises(ValueError, match="square"):
        RandomSquareSymmetryDataset(dataset)
