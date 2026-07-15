# board contract

## state boundaries

`MinesweeperBoard` owns game state. Its `visible_state` observation contains only the public cell encoding:

| value | meaning |
| ---: | --- |
| `-2` | flagged |
| `-1` | covered |
| `0..8` | revealed adjacent-mine count |

Ground-truth mines live separately. `hidden_mines` is unavailable until random placement has occurred and is not part of the observation interface used by agents.

## construction and placement

- Coordinates are zero-based `(row, column)` tuples.
- Boards require positive dimensions and at least one safe cell.
- A seeded random board with `safe_first_click=True` places mines on its first reveal, excluding that selected cell.
- Supplying `mine_positions` preserves those coordinates exactly for reproducible scenarios and tests; it does not relocate a first-click mine.

## actions and lifecycle

- `reveal(coordinate)` returns the safely revealed cells or reports `hit_mine=True`.
- Revealing a zero clears its connected zero region and bordering clues, while leaving flags untouched.
- `toggle_flag(coordinate)` only changes covered cells on an active board.
- `valid_reveals()` exposes covered, unflagged cells without exposing which contain mines.
- The board transitions from `active` to `won` when every safe cell is revealed, or to `lost` after a mine is selected.

## current boundary

This module intentionally stops at board state. The next environment slice will add flattened actions, Gymnasium-style reset/step behavior, serialization, and replay events without changing the visible-state contract.
