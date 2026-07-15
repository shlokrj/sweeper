import numpy as np

from sweeper.agents import ExactAgent, LocalRiskAgent, RandomAgent, SymbolicAgent
from sweeper.environment import COVERED, FLAGGED


def test_random_agent_is_seeded_and_respects_the_action_mask() -> None:
    observation = np.full((2, 2), COVERED, dtype=np.int8)
    info = {"action_mask": np.array([False, True, False, True], dtype=np.bool_)}

    first = RandomAgent(seed=7).select_action(observation, info)
    second = RandomAgent(seed=7).select_action(observation, info)

    assert first == second
    assert first.action in {1, 3}
    assert first.source == "random"
    assert first.mine_risk is None


def test_local_risk_agent_prefers_cells_proven_safe_by_a_completed_clue() -> None:
    observation = np.array(
        [
            [1, FLAGGED],
            [COVERED, COVERED],
        ],
        dtype=np.int8,
    )
    info = {
        "action_mask": np.array([False, False, True, True], dtype=np.bool_),
        "remaining_mines": 0,
    }

    decision = LocalRiskAgent().select_action(observation, info)

    assert decision.action == 2
    assert decision.mine_risk == 0.0
    assert decision.source == "local_heuristic"


def test_symbolic_agent_prioritizes_a_proved_safe_action() -> None:
    observation = np.array(
        [
            [1, FLAGGED],
            [COVERED, COVERED],
        ],
        dtype=np.int8,
    )
    info = {
        "action_mask": np.array([False, False, True, True], dtype=np.bool_),
        "remaining_mines": 0,
    }

    decision = SymbolicAgent().select_action(observation, info)

    assert decision.action == 2
    assert decision.source == "symbolic"
    assert decision.mine_risk == 0.0


def test_exact_agent_reports_exact_risk_for_a_frontier_move() -> None:
    observation = np.array(
        [
            [1, COVERED],
            [COVERED, COVERED],
        ],
        dtype=np.int8,
    )
    info = {
        "action_mask": np.array([False, True, True, True], dtype=np.bool_),
        "mine_count": 1,
        "remaining_mines": 1,
    }

    decision = ExactAgent().select_action(observation, info)

    assert decision.action == 1
    assert decision.source == "exact"
    assert decision.mine_risk == 1 / 3
