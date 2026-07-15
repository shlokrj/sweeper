from pathlib import Path

import numpy as np
import pytest

torch = pytest.importorskip("torch")

from sweeper.agents import NeuralAgent  # noqa: E402
from sweeper.models import MineProbabilityCNN  # noqa: E402


def test_neural_agent_loads_a_checkpoint_and_selects_a_valid_action(tmp_path: Path) -> None:
    checkpoint = tmp_path / "cnn.pt"
    model = MineProbabilityCNN(width=4, residual_blocks=1)
    torch.save({"model_state": model.state_dict(), "width": 4, "residual_blocks": 1}, checkpoint)
    agent = NeuralAgent(checkpoint, device="cpu")
    observation = np.full((2, 2), -1, dtype=np.int8)
    info = {"action_mask": np.asarray([False, True, False, True], dtype=np.bool_)}

    decision = agent.select_action(observation, info)

    assert decision.action in {1, 3}
    assert decision.source == "neural"
    assert decision.mine_risk is not None
    assert 0.0 <= decision.mine_risk <= 1.0
