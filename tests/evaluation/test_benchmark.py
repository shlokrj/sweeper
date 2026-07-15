from sweeper.agents import RandomAgent
from sweeper.environment import MinesweeperEnv
from sweeper.evaluation import evaluate_agent


def test_evaluation_uses_each_seed_and_collects_replayable_actions() -> None:
    result = evaluate_agent(
        RandomAgent(seed=4),
        lambda: MinesweeperEnv(rows=2, columns=2, mine_count=0),
        seeds=(10, 11, 12),
    )

    assert tuple(game.seed for game in result.games) == (10, 11, 12)
    assert all(game.steps == 1 for game in result.games)
    assert all(len(game.actions) == game.steps for game in result.games)
    assert result.win_rate == 1.0
    assert result.loss_rate == 0.0
