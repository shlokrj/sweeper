from sweeper.representation import Constraint
from sweeper.solvers import ExactSolver


def test_exact_solver_counts_symmetric_assignments() -> None:
    first, second = (0, 0), (0, 1)
    result = ExactSolver().solve_constraints(
        (Constraint(frozenset({first, second}), 1),),
        covered_cells=frozenset({first, second}),
        remaining_mines=1,
    )

    assert result.exact is True
    assert result.consistent is True
    assert result.configuration_count == 2
    assert result.probability_for(first) == 0.5
    assert result.probability_for(second) == 0.5


def test_exact_solver_applies_the_global_mine_count_across_constraints() -> None:
    first, middle, last = (0, 0), (0, 1), (0, 2)
    result = ExactSolver().solve_constraints(
        (
            Constraint(frozenset({first, middle}), 1),
            Constraint(frozenset({middle, last}), 1),
        ),
        covered_cells=frozenset({first, middle, last}),
        remaining_mines=1,
    )

    assert result.configuration_count == 1
    assert result.probability_for(first) == 0.0
    assert result.probability_for(middle) == 1.0
    assert result.probability_for(last) == 0.0


def test_exact_solver_combines_frontier_components_with_unconstrained_cells() -> None:
    first, second, outside_one, outside_two = (0, 0), (0, 1), (1, 0), (1, 1)
    result = ExactSolver().solve_constraints(
        (Constraint(frozenset({first, second}), 1),),
        covered_cells=frozenset({first, second, outside_one, outside_two}),
        remaining_mines=2,
    )

    assert result.configuration_count == 4
    assert result.mine_probabilities == {
        first: 0.5,
        second: 0.5,
        outside_one: 0.5,
        outside_two: 0.5,
    }


def test_exact_solver_reports_a_global_density_fallback_for_large_components() -> None:
    cells = frozenset({(0, 0), (0, 1), (0, 2)})
    result = ExactSolver(max_component_size=2).solve_constraints(
        (Constraint(cells, 1),),
        covered_cells=cells,
        remaining_mines=1,
    )

    assert result.exact is False
    assert result.skipped_component_size == 3
    assert set(result.mine_probabilities.values()) == {1 / 3}
