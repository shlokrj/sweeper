"""Deterministic Minesweeper board state with no hidden-state leaks."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from enum import StrEnum
from random import Random

Coordinate = tuple[int, int]

FLAGGED = -2
COVERED = -1


class GameStatus(StrEnum):
    """The lifecycle state of a Minesweeper game."""

    ACTIVE = "active"
    WON = "won"
    LOST = "lost"


@dataclass(frozen=True)
class RevealResult:
    """The outcome of one reveal attempt."""

    revealed: frozenset[Coordinate]
    hit_mine: bool = False


class MinesweeperBoard:
    """A seeded Minesweeper board with separate hidden and visible state.

    Random boards with ``safe_first_click=True`` place mines on the first reveal so
    that selected cell is guaranteed safe. Explicit ``mine_positions`` are useful
    for deterministic examples and tests; they are preserved exactly as supplied.
    """

    _NEIGHBOR_OFFSETS = (
        (-1, -1),
        (-1, 0),
        (-1, 1),
        (0, -1),
        (0, 1),
        (1, -1),
        (1, 0),
        (1, 1),
    )

    def __init__(
        self,
        rows: int,
        columns: int,
        mine_count: int,
        *,
        seed: int | None = None,
        safe_first_click: bool = True,
        mine_positions: Iterable[Coordinate] | None = None,
    ) -> None:
        self._validate_dimensions(rows, columns, mine_count)

        self.rows = rows
        self.columns = columns
        self.mine_count = mine_count
        self.safe_first_click = safe_first_click
        self._random = Random(seed)
        self._visible = [[COVERED for _ in range(columns)] for _ in range(rows)]
        self._mine_positions: set[Coordinate] = set()
        self._generated = mine_positions is not None
        self._flag_count = 0
        self._revealed_safe_count = 0
        self._status = GameStatus.ACTIVE
        self._detonated_mine: Coordinate | None = None

        if mine_positions is not None:
            positions = set(mine_positions)
            if len(positions) != mine_count:
                msg = "mine_positions must contain exactly mine_count unique coordinates"
                raise ValueError(msg)
            for coordinate in positions:
                self._validate_coordinate(coordinate)
            self._mine_positions = positions
        elif not safe_first_click:
            self._generate_mines(exclude=None)

    @property
    def status(self) -> GameStatus:
        """Return whether the game is active, won, or lost."""

        return self._status

    @property
    def detonated_mine(self) -> Coordinate | None:
        """Return the mine selected on loss, without revealing every mine."""

        return self._detonated_mine

    @property
    def remaining_mines(self) -> int:
        """Return the displayed mine counter after accounting for flags."""

        return self.mine_count - self._flag_count

    @property
    def visible_state(self) -> tuple[tuple[int, ...], ...]:
        """Return an immutable observation containing no mine locations."""

        return tuple(tuple(row) for row in self._visible)

    @property
    def hidden_mines(self) -> frozenset[Coordinate]:
        """Return ground truth only after the board has been generated."""

        if not self._generated:
            msg = "mines are not placed until the first safe reveal"
            raise RuntimeError(msg)
        return frozenset(self._mine_positions)

    def reveal(self, coordinate: Coordinate) -> RevealResult:
        """Reveal a covered cell and recursively clear zero regions."""

        self._validate_coordinate(coordinate)

        if self._status is not GameStatus.ACTIVE or self._cell(coordinate) != COVERED:
            return RevealResult(frozenset())

        self._ensure_mines_for_reveal(coordinate)
        if coordinate in self._mine_positions:
            self._status = GameStatus.LOST
            self._detonated_mine = coordinate
            return RevealResult(frozenset(), hit_mine=True)

        revealed = self._reveal_safe_region(coordinate)
        self._revealed_safe_count += len(revealed)
        if self._revealed_safe_count == self.rows * self.columns - self.mine_count:
            self._status = GameStatus.WON

        return RevealResult(frozenset(revealed))

    def toggle_flag(self, coordinate: Coordinate) -> bool:
        """Toggle a flag on a covered cell and report whether the state changed."""

        self._validate_coordinate(coordinate)
        if self._status is not GameStatus.ACTIVE:
            return False

        cell = self._cell(coordinate)
        if cell == COVERED:
            self._set_cell(coordinate, FLAGGED)
            self._flag_count += 1
            return True
        if cell == FLAGGED:
            self._set_cell(coordinate, COVERED)
            self._flag_count -= 1
            return True
        return False

    def valid_reveals(self) -> frozenset[Coordinate]:
        """Return currently legal reveal coordinates without exposing mines."""

        if self._status is not GameStatus.ACTIVE:
            return frozenset()
        return frozenset(
            (row, column)
            for row in range(self.rows)
            for column in range(self.columns)
            if self._visible[row][column] == COVERED
        )

    def visible_at(self, coordinate: Coordinate) -> int:
        """Return one visible cell value using the public board encoding."""

        self._validate_coordinate(coordinate)
        return self._cell(coordinate)

    def _ensure_mines_for_reveal(self, coordinate: Coordinate) -> None:
        if self._generated:
            return
        exclude = coordinate if self.safe_first_click else None
        self._generate_mines(exclude=exclude)

    def _generate_mines(self, *, exclude: Coordinate | None) -> None:
        candidates = [
            (row, column)
            for row in range(self.rows)
            for column in range(self.columns)
            if (row, column) != exclude
        ]
        if self.mine_count > len(candidates):
            msg = "mine_count leaves no safe first-click cell"
            raise ValueError(msg)
        self._mine_positions = set(self._random.sample(candidates, self.mine_count))
        self._generated = True

    def _reveal_safe_region(self, start: Coordinate) -> set[Coordinate]:
        pending = [start]
        revealed: set[Coordinate] = set()

        while pending:
            coordinate = pending.pop()
            if self._cell(coordinate) != COVERED or coordinate in self._mine_positions:
                continue

            clue = self._adjacent_mine_count(coordinate)
            self._set_cell(coordinate, clue)
            revealed.add(coordinate)

            if clue == 0:
                pending.extend(
                    neighbor
                    for neighbor in self._neighbors(coordinate)
                    if self._cell(neighbor) == COVERED and neighbor not in self._mine_positions
                )

        return revealed

    def _adjacent_mine_count(self, coordinate: Coordinate) -> int:
        return sum(neighbor in self._mine_positions for neighbor in self._neighbors(coordinate))

    def _neighbors(self, coordinate: Coordinate) -> tuple[Coordinate, ...]:
        row, column = coordinate
        return tuple(
            (row + row_offset, column + column_offset)
            for row_offset, column_offset in self._NEIGHBOR_OFFSETS
            if 0 <= row + row_offset < self.rows and 0 <= column + column_offset < self.columns
        )

    def _cell(self, coordinate: Coordinate) -> int:
        row, column = coordinate
        return self._visible[row][column]

    def _set_cell(self, coordinate: Coordinate, value: int) -> None:
        row, column = coordinate
        self._visible[row][column] = value

    @staticmethod
    def _validate_dimensions(rows: int, columns: int, mine_count: int) -> None:
        if type(rows) is not int or rows <= 0:
            raise ValueError("rows must be a positive integer")
        if type(columns) is not int or columns <= 0:
            raise ValueError("columns must be a positive integer")
        if type(mine_count) is not int or not 0 <= mine_count < rows * columns:
            raise ValueError("mine_count must be between zero and the number of cells minus one")

    def _validate_coordinate(self, coordinate: Coordinate) -> None:
        if (
            not isinstance(coordinate, tuple)
            or len(coordinate) != 2
            or any(type(value) is not int for value in coordinate)
        ):
            raise TypeError("coordinate must be a two-integer tuple")

        row, column = coordinate
        if not 0 <= row < self.rows or not 0 <= column < self.columns:
            raise ValueError("coordinate is outside the board")
