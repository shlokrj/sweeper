"""Convert visible Minesweeper clues into formal mine-count constraints."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from sweeper.environment import COVERED, FLAGGED, Coordinate


@dataclass(frozen=True, order=True)
class Constraint:
    """A set of covered cells that contains an exact number of mines."""

    cells: frozenset[Coordinate]
    mines: int


@dataclass(frozen=True)
class ConstraintExtraction:
    """Constraints and consistency information derived from one observation."""

    constraints: tuple[Constraint, ...]
    inconsistent: bool

    @property
    def frontier(self) -> frozenset[Coordinate]:
        """Return covered cells that are adjacent to at least one clue."""

        return frozenset().union(*(constraint.cells for constraint in self.constraints))


def extract_constraints(observation: np.ndarray) -> ConstraintExtraction:
    """Extract equations from visible clues without accessing hidden mines."""

    if observation.ndim != 2:
        raise ValueError("observation must be a two-dimensional board matrix")

    rows, columns = observation.shape
    constraints: set[Constraint] = set()
    inconsistent = False
    for row in range(rows):
        for column in range(columns):
            clue = int(observation[row, column])
            if not 0 <= clue <= 8:
                continue

            neighbors = _neighbors(row, column, rows, columns)
            covered_cells = frozenset(
                (neighbor_row, neighbor_column)
                for neighbor_row, neighbor_column in neighbors
                if int(observation[neighbor_row, neighbor_column]) == COVERED
            )
            flagged_count = sum(
                int(observation[neighbor_row, neighbor_column]) == FLAGGED
                for neighbor_row, neighbor_column in neighbors
            )
            remaining_mines = clue - flagged_count

            if not 0 <= remaining_mines <= len(covered_cells):
                inconsistent = True
                continue
            if covered_cells:
                constraints.add(Constraint(covered_cells, remaining_mines))
            elif remaining_mines:
                inconsistent = True

    return ConstraintExtraction(
        constraints=tuple(sorted(constraints, key=_constraint_key)),
        inconsistent=inconsistent,
    )


def _constraint_key(constraint: Constraint) -> tuple[int, tuple[Coordinate, ...], int]:
    return (len(constraint.cells), tuple(sorted(constraint.cells)), constraint.mines)


def _neighbors(row: int, column: int, rows: int, columns: int) -> tuple[Coordinate, ...]:
    return tuple(
        (neighbor_row, neighbor_column)
        for neighbor_row in range(max(0, row - 1), min(rows, row + 2))
        for neighbor_column in range(max(0, column - 1), min(columns, column + 2))
        if (neighbor_row, neighbor_column) != (row, column)
    )
