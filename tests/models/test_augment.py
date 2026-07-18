import pytest

torch = pytest.importorskip("torch")
from torch.utils.data import TensorDataset  # noqa: E402

from sweeper.models.augment import (  # noqa: E402
    RandomBoardSymmetryDataset,
    RandomSquareSymmetryDataset,
    _apply_rectangular_symmetry,
    _apply_square_symmetry,
)


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


def test_rectangular_symmetries_keep_shape_and_labels_aligned() -> None:
    observation = torch.arange(6, dtype=torch.int8).reshape(2, 3)
    targets = observation.float() + 100
    mask = observation + 50

    for symmetry in range(4):
        transformed_observation = _apply_rectangular_symmetry(observation, symmetry)
        transformed_targets = _apply_rectangular_symmetry(targets, symmetry)
        transformed_mask = _apply_rectangular_symmetry(mask, symmetry)

        assert transformed_observation.shape == observation.shape
        assert torch.equal(transformed_targets, transformed_observation.float() + 100)
        assert torch.equal(transformed_mask, transformed_observation + 50)


def test_random_board_symmetry_dataset_accepts_rectangular_boards() -> None:
    observation = torch.arange(6, dtype=torch.int8).reshape(1, 2, 3)
    dataset = TensorDataset(observation, observation.float() + 100, observation + 50)

    transformed = RandomBoardSymmetryDataset(dataset)[0]

    assert all(tensor.shape == (2, 3) for tensor in transformed)
    assert torch.equal(transformed[1], transformed[0].float() + 100)
    assert torch.equal(transformed[2], transformed[0] + 50)


def test_random_symmetry_dataset_keeps_strategy_masks_aligned() -> None:
    observation = torch.arange(9, dtype=torch.int8).reshape(1, 3, 3)
    targets = observation.float() + 100
    mask = observation + 50
    safe_mask = observation + 25
    mine_mask = observation + 75
    dataset = TensorDataset(observation, targets, mask, safe_mask, mine_mask)

    transformed = RandomSquareSymmetryDataset(dataset)[0]

    assert len(transformed) == 5
    (
        transformed_observation,
        transformed_targets,
        transformed_mask,
        transformed_safe,
        transformed_mines,
    ) = transformed
    assert torch.equal(transformed_targets, transformed_observation.float() + 100)
    assert torch.equal(transformed_mask, transformed_observation + 50)
    assert torch.equal(transformed_safe, transformed_observation + 25)
    assert torch.equal(transformed_mines, transformed_observation + 75)
