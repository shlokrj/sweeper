import numpy as np

from sweeper.environment import COVERED, FLAGGED
from sweeper.representation import Constraint
from sweeper.solvers import SymbolicSolver


def test_symbolic_solver_finds_direct_safe_and_mine_cells() -> None:
    solver = SymbolicSolver()
    safe_constraint = Constraint(frozenset({(0, 0), (0, 1)}), 0)
    mine_constraint = Constraint(frozenset({(1, 0), (1, 1)}), 2)

    result = solver.solve_constraints((safe_constraint, mine_constraint))

    assert result.safe_cells == frozenset({(0, 0), (0, 1)})
    assert result.mine_cells == frozenset({(1, 0), (1, 1)})
    assert result.proof_for((0, 0)).rule == "all_safe"
    assert result.proof_for((1, 0)).rule == "all_mines"


def test_symbolic_solver_proves_a_cell_with_constraint_subtraction() -> None:
    solver = SymbolicSolver()
    larger = Constraint(frozenset({(0, 0), (0, 1), (0, 2)}), 1)
    smaller = Constraint(frozenset({(0, 1), (0, 2)}), 1)

    result = solver.solve_constraints((larger, smaller))

    proof = result.proof_for((0, 0))
    assert result.safe_cells == frozenset({(0, 0)})
    assert proof.rule == "constraint_subset"
    assert proof.supporting_constraints == (smaller, larger)


def test_symbolic_solver_marks_inconsistent_visible_flags_without_claiming_a_proof() -> None:
    observation = np.array([[0, FLAGGED], [COVERED, COVERED]], dtype=np.int8)

    result = SymbolicSolver().solve(observation)

    assert result.consistent is False
    assert result.proofs == ()
