"""Exact Mine probability calculation by constraint-component enumeration."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from math import comb

import numpy as np

from sweeper.environment import COVERED, FLAGGED, Coordinate
from sweeper.representation import Constraint, extract_constraints


@dataclass(frozen=True)
class ExactResult:
    """Mine probabilities and provenance from an exact or bounded calculation."""

    mine_probabilities: dict[Coordinate, float]
    configuration_count: int
    exact: bool
    consistent: bool
    skipped_component_size: int | None = None

    def probability_for(self, cell: Coordinate) -> float | None:
        """Return a cell probability when that cell was part of the input state."""

        return self.mine_probabilities.get(cell)


@dataclass(frozen=True)
class _ComponentSolutions:
    cells: tuple[Coordinate, ...]
    counts_by_mines: dict[int, int]
    mine_hits_by_cell: dict[Coordinate, dict[int, int]]


class ExactSolver:
    """Enumerate tractable constraint components and apply the global mine count."""

    def __init__(self, *, max_component_size: int = 18) -> None:
        if max_component_size <= 0:
            raise ValueError("max_component_size must be positive")
        self.max_component_size = max_component_size

    def solve(self, observation: np.ndarray, mine_count: int) -> ExactResult:
        """Return probabilities for every unflagged covered cell in an observation."""

        if observation.ndim != 2:
            raise ValueError("observation must be a two-dimensional board matrix")

        extraction = extract_constraints(observation)
        covered_cells = frozenset(
            (row, column)
            for row in range(observation.shape[0])
            for column in range(observation.shape[1])
            if int(observation[row, column]) == COVERED
        )
        flagged_count = int(np.count_nonzero(observation == FLAGGED))
        remaining_mines = mine_count - flagged_count
        if extraction.inconsistent or not 0 <= remaining_mines <= len(covered_cells):
            return ExactResult({}, 0, exact=True, consistent=False)
        return self.solve_constraints(
            extraction.constraints,
            covered_cells=covered_cells,
            remaining_mines=remaining_mines,
        )

    def solve_constraints(
        self,
        constraints: tuple[Constraint, ...],
        *,
        covered_cells: frozenset[Coordinate],
        remaining_mines: int,
    ) -> ExactResult:
        """Solve explicit constraints for focused tests and data-generation code."""

        if not 0 <= remaining_mines <= len(covered_cells):
            return ExactResult({}, 0, exact=True, consistent=False)
        if any(not constraint.cells <= covered_cells for constraint in constraints):
            return ExactResult({}, 0, exact=True, consistent=False)
        if any(not 0 <= constraint.mines <= len(constraint.cells) for constraint in constraints):
            return ExactResult({}, 0, exact=True, consistent=False)

        components = _constraint_components(constraints)
        largest_component = max((len(component[0]) for component in components), default=0)
        if largest_component > self.max_component_size:
            return self._fallback_result(covered_cells, remaining_mines, largest_component)

        solved_components = [_enumerate_component(cells, group) for cells, group in components]
        if any(not component.counts_by_mines for component in solved_components):
            return ExactResult({}, 0, exact=True, consistent=False)

        frontier = frozenset().union(*(component.cells for component in solved_components))
        outside_cells = tuple(sorted(covered_cells - frontier))
        component_distributions = [component.counts_by_mines for component in solved_components]
        outside_distribution = {
            mines: comb(len(outside_cells), mines) for mines in range(len(outside_cells) + 1)
        }
        total_distribution = _convolve_all((*component_distributions, outside_distribution))
        configuration_count = total_distribution.get(remaining_mines, 0)
        if configuration_count == 0:
            return ExactResult({}, 0, exact=True, consistent=False)

        probabilities: dict[Coordinate, float] = {}
        for index, component in enumerate(solved_components):
            other_distribution = _convolve_all(
                (
                    *component_distributions[:index],
                    *component_distributions[index + 1 :],
                    outside_distribution,
                )
            )
            for cell, hits_by_mines in component.mine_hits_by_cell.items():
                mine_configurations = sum(
                    hit_count * other_distribution.get(remaining_mines - mines, 0)
                    for mines, hit_count in hits_by_mines.items()
                )
                probabilities[cell] = mine_configurations / configuration_count

        if outside_cells:
            component_distribution = _convolve_all(component_distributions)
            outside_mine_configurations = sum(
                comb(len(outside_cells) - 1, mines - 1)
                * component_distribution.get(remaining_mines - mines, 0)
                for mines in range(1, len(outside_cells) + 1)
            )
            outside_probability = outside_mine_configurations / configuration_count
            probabilities.update({cell: outside_probability for cell in outside_cells})

        return ExactResult(
            mine_probabilities=probabilities,
            configuration_count=configuration_count,
            exact=True,
            consistent=True,
        )

    def _fallback_result(
        self,
        covered_cells: frozenset[Coordinate],
        remaining_mines: int,
        skipped_component_size: int,
    ) -> ExactResult:
        probability = remaining_mines / len(covered_cells) if covered_cells else 0.0
        return ExactResult(
            mine_probabilities={cell: probability for cell in covered_cells},
            configuration_count=0,
            exact=False,
            consistent=True,
            skipped_component_size=skipped_component_size,
        )


def _constraint_components(
    constraints: tuple[Constraint, ...],
) -> tuple[tuple[tuple[Coordinate, ...], tuple[Constraint, ...]], ...]:
    remaining = set(constraints)
    components: list[tuple[tuple[Coordinate, ...], tuple[Constraint, ...]]] = []
    while remaining:
        first = min(remaining, key=_constraint_key)
        remaining.remove(first)
        component_constraints = {first}
        component_cells = set(first.cells)
        expanded = True
        while expanded:
            expanded = False
            connected = {
                constraint for constraint in remaining if constraint.cells & component_cells
            }
            if connected:
                remaining.difference_update(connected)
                component_constraints.update(connected)
                component_cells.update(
                    cell for constraint in connected for cell in constraint.cells
                )
                expanded = True
        components.append(
            (
                tuple(sorted(component_cells)),
                tuple(sorted(component_constraints, key=_constraint_key)),
            )
        )
    return tuple(components)


def _enumerate_component(
    cells: tuple[Coordinate, ...],
    constraints: tuple[Constraint, ...],
) -> _ComponentSolutions:
    cell_indices = {cell: index for index, cell in enumerate(cells)}
    indexed_constraints = tuple(
        (tuple(cell_indices[cell] for cell in constraint.cells), constraint.mines)
        for constraint in constraints
    )
    assignments = [0] * len(cells)
    counts_by_mines: dict[int, int] = defaultdict(int)
    mine_hits_by_cell: dict[Coordinate, dict[int, int]] = {cell: defaultdict(int) for cell in cells}

    def is_viable(assigned_count: int) -> bool:
        for indices, mine_total in indexed_constraints:
            assigned_mines = sum(assignments[index] for index in indices if index < assigned_count)
            unassigned_count = sum(index >= assigned_count for index in indices)
            if assigned_mines > mine_total or assigned_mines + unassigned_count < mine_total:
                return False
        return True

    def search(index: int) -> None:
        if index == len(cells):
            mine_total = sum(assignments)
            counts_by_mines[mine_total] += 1
            for cell_index, cell in enumerate(cells):
                if assignments[cell_index]:
                    mine_hits_by_cell[cell][mine_total] += 1
            return

        for value in (0, 1):
            assignments[index] = value
            if is_viable(index + 1):
                search(index + 1)
        assignments[index] = 0

    search(0)
    return _ComponentSolutions(
        cells=cells,
        counts_by_mines=dict(counts_by_mines),
        mine_hits_by_cell={cell: dict(hits) for cell, hits in mine_hits_by_cell.items()},
    )


def _convolve_all(distributions: tuple[dict[int, int], ...]) -> dict[int, int]:
    result = {0: 1}
    for distribution in distributions:
        next_result: dict[int, int] = defaultdict(int)
        for left_mines, left_count in result.items():
            for right_mines, right_count in distribution.items():
                next_result[left_mines + right_mines] += left_count * right_count
        result = dict(next_result)
    return result


def _constraint_key(constraint: Constraint) -> tuple[int, tuple[Coordinate, ...], int]:
    return (len(constraint.cells), tuple(sorted(constraint.cells)), constraint.mines)
