import numpy as np
import pytest

from sweeper.environment import GameStatus, MinesweeperBoard, MinesweeperEnv


def test_reset_returns_a_visible_observation_and_flat_action_mask() -> None:
    env = MinesweeperEnv(rows=3, columns=2, mine_count=2)

    observation, info = env.reset(seed=42)

    assert observation.dtype == np.int8
    assert observation.shape == (3, 2)
    assert env.observation_space.contains(observation)
    assert info["status"] == GameStatus.ACTIVE.value
    assert info["episode_seed"] == 42
    assert info["action_mask"].dtype == np.bool_
    assert info["action_mask"].tolist() == [True] * 6


def test_flattened_action_reveals_the_expected_coordinate_and_records_the_event() -> None:
    env = MinesweeperEnv(rows=2, columns=2, mine_count=0)
    env.reset(seed=5)

    observation, reward, terminated, truncated, info = env.step(2)

    assert observation.tolist() == [[0, 0], [0, 0]]
    assert reward == 4.0
    assert terminated is True
    assert truncated is False
    assert info["action_mask"].tolist() == [False] * 4
    assert env.replay_events[0].kind == "reset"
    assert env.replay_events[0].episode_seed == 5
    assert env.replay_events[1].coordinate == (1, 0)
    assert env.replay_events[1].revealed == frozenset({(0, 0), (0, 1), (1, 0), (1, 1)})


def test_seeded_reset_and_action_sequence_reproduce_the_same_transition() -> None:
    first = MinesweeperEnv(rows=4, columns=4, mine_count=3)
    second = MinesweeperEnv(rows=4, columns=4, mine_count=3)

    first.reset(seed=29)
    second.reset(seed=29)

    first_transition = first.step(5)
    second_transition = second.step(5)

    assert np.array_equal(first_transition[0], second_transition[0])
    assert first_transition[1:4] == second_transition[1:4]
    assert np.array_equal(first_transition[4]["action_mask"], second_transition[4]["action_mask"])
    assert first_transition[4]["status"] == second_transition[4]["status"]
    assert first.replay_events == second.replay_events


def test_mine_selection_terminates_with_negative_reward() -> None:
    reference = MinesweeperBoard(
        rows=2,
        columns=2,
        mine_count=1,
        seed=17,
        safe_first_click=False,
    )
    mine_row, mine_column = next(iter(reference.hidden_mines))
    action = mine_row * 2 + mine_column
    env = MinesweeperEnv(rows=2, columns=2, mine_count=1, safe_first_click=False)
    env.reset(seed=17)

    _, reward, terminated, truncated, info = env.step(action)

    assert reward == -1.0
    assert terminated is True
    assert truncated is False
    assert info["status"] == GameStatus.LOST.value
    assert env.replay_events[-1].hit_mine is True


def test_step_rejects_actions_before_reset_after_termination_and_when_masked() -> None:
    env = MinesweeperEnv(rows=2, columns=2, mine_count=0)

    with pytest.raises(RuntimeError, match="reset"):
        env.step(0)

    env.reset(seed=3)
    env.step(0)
    with pytest.raises(RuntimeError, match="terminal"):
        env.step(0)

    env = MinesweeperEnv(rows=2, columns=2, mine_count=1)
    env.reset(seed=3)
    with pytest.raises(ValueError, match="outside"):
        env.step(4)

    env = MinesweeperEnv(rows=3, columns=3, mine_count=7)
    env.reset(seed=3)
    env.step(0)
    with pytest.raises(ValueError, match="covered"):
        env.step(0)
