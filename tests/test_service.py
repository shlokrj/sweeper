from pathlib import Path

import pytest

from sweeper.agents import AgentDecision
from sweeper.service import ModelMoveService


class FakeAgent:
    def __init__(self, checkpoint: Path, **_: object) -> None:
        self.checkpoint = checkpoint

    def select_action(self, observation, info):  # type: ignore[no-untyped-def]
        action = next(index for index, enabled in enumerate(info["action_mask"]) if enabled)
        return AgentDecision(
            action=action,
            source="neural_hybrid_neural",
            mine_risk=0.125,
            rationale=f"selected from a {observation.shape[0]} row board",
        )


def _service() -> ModelMoveService:
    return ModelMoveService(artifact_root=Path("/models"), agent_factory=FakeAgent)


def test_service_uses_the_expert_autoplay_checkpoint_and_ignores_flags() -> None:
    response = _service().move(
        {
            "rows": 16,
            "columns": 30,
            "mines": 99,
            "remaining_mines": 98,
            "mode": "auto",
            "board": [-2, *([-1] * 479)],
        }
    )

    assert response.action == 1
    assert response.preset == "expert"
    assert response.source == "neural_hybrid_neural"


def test_service_uses_the_expert_assisted_checkpoint() -> None:
    service = _service()
    response = service.move(
        {
            "rows": 16,
            "columns": 30,
            "mines": 99,
            "remaining_mines": 99,
            "mode": "assisted",
            "board": [-1] * 480,
        }
    )

    assert response.action == 0
    assert response.preset == "expert"
    assert service._agents  # type: ignore[attr-defined]
    (_, checkpoint), = service._agents  # type: ignore[attr-defined]
    assert checkpoint == Path("/models/artifacts/cnn-expert-strategy.pt")


def test_service_rejects_an_unstudied_or_unavailable_board() -> None:
    with pytest.raises(ValueError, match="no measured model policy"):
        _service().move(
            {
                "rows": 9,
                "columns": 9,
                "mines": 11,
                "remaining_mines": 11,
                "mode": "assisted",
                "board": [-1] * 81,
            }
        )

    with pytest.raises(ValueError, match="no covered cells"):
        _service().move(
            {
                "rows": 9,
                "columns": 9,
                "mines": 10,
                "remaining_mines": 10,
                "mode": "assisted",
                "board": [0] * 81,
            }
        )
