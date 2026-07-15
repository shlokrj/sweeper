import numpy as np

from sweeper.data import GenerationConfig, generate_labeled_states, save_dataset


def test_generation_is_seeded_and_keeps_hidden_truth_separate_from_observations() -> None:
    config = GenerationConfig(rows=3, columns=3, mine_count=1, seeds=(4, 5), max_steps_per_game=3)

    first = generate_labeled_states(config)
    second = generate_labeled_states(config)

    assert first
    assert len(first) == len(second)
    for left, right in zip(first, second, strict=True):
        assert (left.seed, left.step) == (right.seed, right.step)
        assert np.array_equal(left.observation, right.observation)
        assert np.array_equal(left.mine_probabilities, right.mine_probabilities, equal_nan=True)
        assert left.observation.dtype == np.int8
        assert left.ground_truth_mines.dtype == np.bool_
        assert np.isnan(
            left.mine_probabilities[~left.action_mask.reshape(left.observation.shape)]
        ).all()


def test_save_dataset_writes_stacked_training_arrays(tmp_path) -> None:
    states = generate_labeled_states(
        GenerationConfig(rows=3, columns=3, mine_count=1, seeds=(8,), max_steps_per_game=2)
    )
    path = tmp_path / "labels.npz"

    save_dataset(path, states)

    with np.load(path) as dataset:
        assert dataset["observations"].shape[0] == len(states)
        assert dataset["action_masks"].dtype == np.bool_
        assert dataset["ground_truth_mines"].dtype == np.bool_
