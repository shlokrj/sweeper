import numpy as np

from sweeper.environment import COVERED, FLAGGED
from sweeper.representation import Constraint, extract_constraints


def test_constraint_extraction_subtracts_flags_from_visible_clues() -> None:
    observation = np.array(
        [
            [1, FLAGGED],
            [COVERED, COVERED],
        ],
        dtype=np.int8,
    )

    extraction = extract_constraints(observation)

    assert extraction.constraints == (Constraint(frozenset({(1, 0), (1, 1)}), 0),)
    assert extraction.frontier == frozenset({(1, 0), (1, 1)})
    assert extraction.inconsistent is False
