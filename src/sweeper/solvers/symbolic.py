"""Fixed-point symbolic deduction over Minesweeper constraints."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np

from sweeper.environment import Coordinate
from sweeper.representation import Constraint, extract_constraints

ProofRule = Literal["all_safe", "all_mines", "constraint_subset"]
Classification = Literal["safe", "mine"]


@dataclass(frozen=True)
class SymbolicProof:
    """Faithful evidence for one guaranteed-safe or guaranteed-mine cell."""

    cell: Coordinate
    classification: Classification
    rule: ProofRule
    supporting_constraints: tuple[Constraint, ...]


@dataclass(frozen=True)
class SymbolicResult:
    """The complete set of deductions reached at the symbolic fixed point."""

    safe_cells: frozenset[Coordinate]
    mine_cells: frozenset[Coordinate]
    proofs: tuple[SymbolicProof, ...]
    constraints: tuple[Constraint, ...]
    consistent: bool

    def proof_for(self, cell: Coordinate) -> SymbolicProof | None:
        """Return the stored proof for a deduced cell, when available."""

        return next((proof for proof in self.proofs if proof.cell == cell), None)


@dataclass(frozen=True)
class _Evidence:
    rule: ProofRule | None
    supporting_constraints: tuple[Constraint, ...]


class SymbolicSolver:
    """Apply direct and subset deductions until no new facts can be inferred."""

    def solve(self, observation: np.ndarray) -> SymbolicResult:
        """Extract visible constraints and perform symbolic deduction."""

        extraction = extract_constraints(observation)
        result = self.solve_constraints(extraction.constraints)
        if extraction.inconsistent:
            return SymbolicResult(
                safe_cells=result.safe_cells,
                mine_cells=result.mine_cells,
                proofs=result.proofs,
                constraints=result.constraints,
                consistent=False,
            )
        return result

    def solve_constraints(self, constraints: tuple[Constraint, ...]) -> SymbolicResult:
        """Solve a supplied constraint system; useful for focused reasoning tests."""

        evidence = {constraint: _Evidence(None, ()) for constraint in constraints}
        safe_cells: dict[Coordinate, SymbolicProof] = {}
        mine_cells: dict[Coordinate, SymbolicProof] = {}
        consistent = True

        while consistent:
            normalized = self._normalize_constraints(evidence, safe_cells, mine_cells)
            if normalized is None:
                consistent = False
                break

            new_fact = False
            for constraint, source in sorted(
                normalized.items(), key=lambda item: _constraint_key(item[0])
            ):
                classification: Classification | None = None
                if constraint.mines == 0:
                    classification = "safe"
                elif constraint.mines == len(constraint.cells):
                    classification = "mine"
                if classification is None:
                    continue

                rule = source.rule or ("all_safe" if classification == "safe" else "all_mines")
                support = source.supporting_constraints or (constraint,)
                for cell in sorted(constraint.cells):
                    proof = SymbolicProof(cell, classification, rule, support)
                    target = safe_cells if classification == "safe" else mine_cells
                    opposite = mine_cells if classification == "safe" else safe_cells
                    if cell in opposite:
                        consistent = False
                        break
                    if cell not in target:
                        target[cell] = proof
                        new_fact = True
                if not consistent:
                    break
            if not consistent or new_fact:
                continue

            derived = self._derive_subset_constraints(normalized)
            additions = {
                constraint: source
                for constraint, source in derived.items()
                if constraint not in evidence
            }
            if not additions:
                break
            evidence.update(additions)

        final_constraints = self._final_constraints(evidence, safe_cells, mine_cells)
        proofs = tuple(
            sorted(
                (*safe_cells.values(), *mine_cells.values()),
                key=lambda proof: (proof.cell, proof.classification),
            )
        )
        return SymbolicResult(
            safe_cells=frozenset(safe_cells),
            mine_cells=frozenset(mine_cells),
            proofs=proofs,
            constraints=final_constraints,
            consistent=consistent,
        )

    def _normalize_constraints(
        self,
        evidence: dict[Constraint, _Evidence],
        safe_cells: dict[Coordinate, SymbolicProof],
        mine_cells: dict[Coordinate, SymbolicProof],
    ) -> dict[Constraint, _Evidence] | None:
        normalized: dict[Constraint, _Evidence] = {}
        known_safe = frozenset(safe_cells)
        known_mines = frozenset(mine_cells)
        for constraint, source in evidence.items():
            cells = constraint.cells - known_safe - known_mines
            mines = constraint.mines - len(constraint.cells & known_mines)
            if not 0 <= mines <= len(cells):
                return None
            if cells:
                normalized.setdefault(Constraint(cells, mines), source)
            elif mines:
                return None
        return normalized

    def _derive_subset_constraints(
        self,
        constraints: dict[Constraint, _Evidence],
    ) -> dict[Constraint, _Evidence]:
        derived: dict[Constraint, _Evidence] = {}
        ordered = sorted(constraints, key=_constraint_key)
        for subset in ordered:
            for superset in ordered:
                if subset == superset or not subset.cells < superset.cells:
                    continue
                difference = Constraint(
                    cells=superset.cells - subset.cells,
                    mines=superset.mines - subset.mines,
                )
                if 0 <= difference.mines <= len(difference.cells):
                    derived.setdefault(
                        difference,
                        _Evidence("constraint_subset", (subset, superset)),
                    )
        return derived

    def _final_constraints(
        self,
        evidence: dict[Constraint, _Evidence],
        safe_cells: dict[Coordinate, SymbolicProof],
        mine_cells: dict[Coordinate, SymbolicProof],
    ) -> tuple[Constraint, ...]:
        normalized = self._normalize_constraints(evidence, safe_cells, mine_cells)
        return tuple(sorted(normalized, key=_constraint_key)) if normalized is not None else ()


def _constraint_key(constraint: Constraint) -> tuple[int, tuple[Coordinate, ...], int]:
    return (len(constraint.cells), tuple(sorted(constraint.cells)), constraint.mines)
