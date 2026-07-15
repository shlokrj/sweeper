import pytest

from sweeper.environment import COVERED, FLAGGED, GameStatus, MinesweeperBoard, RevealResult


def test_initial_observation_hides_mines_until_the_first_reveal() -> None:
    board = MinesweeperBoard(rows=3, columns=3, mine_count=2, seed=9)

    assert board.visible_state == ((COVERED, COVERED, COVERED),) * 3
    with pytest.raises(RuntimeError, match="not placed"):
        _ = board.hidden_mines


def test_seeded_boards_reproduce_the_same_safe_first_reveal() -> None:
    left = MinesweeperBoard(rows=5, columns=5, mine_count=6, seed=73)
    right = MinesweeperBoard(rows=5, columns=5, mine_count=6, seed=73)

    assert left.reveal((2, 2)) == right.reveal((2, 2))
    assert left.hidden_mines == right.hidden_mines
    assert (2, 2) not in left.hidden_mines
    assert left.visible_state == right.visible_state


def test_zero_reveal_clears_connected_region_and_wins_when_all_safe_cells_are_open() -> None:
    board = MinesweeperBoard(
        rows=3,
        columns=3,
        mine_count=1,
        mine_positions={(2, 2)},
    )

    result = board.reveal((0, 0))

    assert result == RevealResult(
        frozenset(
            {
                (0, 0),
                (0, 1),
                (0, 2),
                (1, 0),
                (1, 1),
                (1, 2),
                (2, 0),
                (2, 1),
            }
        )
    )
    assert board.visible_state == ((0, 0, 0), (0, 1, 1), (0, 1, COVERED))
    assert board.status is GameStatus.WON


def test_flags_change_the_visible_state_and_remove_a_cell_from_valid_reveals() -> None:
    board = MinesweeperBoard(
        rows=2,
        columns=2,
        mine_count=1,
        mine_positions={(1, 1)},
    )

    assert board.toggle_flag((1, 1))
    assert board.visible_at((1, 1)) == FLAGGED
    assert board.remaining_mines == 0
    assert (1, 1) not in board.valid_reveals()
    assert board.reveal((1, 1)) == RevealResult(frozenset())

    assert board.toggle_flag((1, 1))
    assert board.visible_at((1, 1)) == COVERED
    assert board.remaining_mines == 1


def test_revealing_a_mine_ends_the_game_without_revealing_ground_truth() -> None:
    board = MinesweeperBoard(
        rows=2,
        columns=2,
        mine_count=1,
        mine_positions={(1, 1)},
    )

    result = board.reveal((1, 1))

    assert result == RevealResult(frozenset(), hit_mine=True)
    assert board.status is GameStatus.LOST
    assert board.detonated_mine == (1, 1)
    assert board.visible_at((1, 1)) == COVERED
    assert board.valid_reveals() == frozenset()


@pytest.mark.parametrize(
    ("rows", "columns", "mine_count"),
    [
        (0, 2, 0),
        (2, 0, 0),
        (2, 2, -1),
        (2, 2, 4),
    ],
)
def test_board_rejects_invalid_dimensions_and_mine_counts(
    rows: int,
    columns: int,
    mine_count: int,
) -> None:
    with pytest.raises(ValueError):
        MinesweeperBoard(rows=rows, columns=columns, mine_count=mine_count)
