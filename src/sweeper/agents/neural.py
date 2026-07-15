"""Learned mine-risk agent backed by a trained Sweeper CNN checkpoint."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from sweeper.agents.base import AgentDecision
from sweeper.agents.random_agent import _valid_actions


class NeuralAgent:
    """Choose the valid cell with the lowest model-estimated mine probability.

    The agent intentionally labels its decisions as ``neural``: its probabilities are
    learned estimates and never proof that a move is safe.
    """

    def __init__(self, checkpoint: Path, *, device: str | None = None) -> None:
        """Load a CNN checkpoint without making PyTorch a base runtime dependency."""

        try:
            import torch
        except ImportError as error:  # pragma: no cover - exercised without the train extra
            raise RuntimeError("NeuralAgent requires the optional 'train' dependency") from error

        from sweeper.models.cnn import MineProbabilityCNN
        from sweeper.models.strategy import STRATEGY_FEATURE_CHANNELS

        if not checkpoint.is_file():
            raise FileNotFoundError(f"model checkpoint does not exist: {checkpoint}")

        self._torch = torch
        self._device = _inference_device(torch, device)
        payload = torch.load(checkpoint, map_location="cpu", weights_only=True)
        if not isinstance(payload, dict) or "model_state" not in payload:
            raise ValueError("checkpoint must contain a model_state mapping")

        width = int(payload.get("width", 64))
        residual_blocks = int(payload.get("residual_blocks", 4))
        self._extra_channels = int(payload.get("extra_channels", 0))
        if self._extra_channels not in {0, STRATEGY_FEATURE_CHANNELS}:
            raise ValueError("checkpoint uses unsupported extra feature channels")
        self._model = MineProbabilityCNN(
            width=width,
            residual_blocks=residual_blocks,
            extra_channels=self._extra_channels,
        )
        self._model.load_state_dict(payload["model_state"])
        self._model.to(self._device)
        self._model.eval()
        self._symbolic_solver = None
        if self._extra_channels:
            from sweeper.solvers import SymbolicSolver

            self._symbolic_solver = SymbolicSolver()

    def select_action(self, observation: np.ndarray, info: dict[str, Any]) -> AgentDecision:
        """Select the valid action with the lowest predicted mine risk."""

        if observation.ndim != 2:
            raise ValueError("observation must be a two-dimensional board matrix")

        valid_actions = _valid_actions(info)
        probabilities = self.predict_probabilities(observation, info)

        action = min(
            valid_actions, key=lambda candidate: (float(probabilities[candidate]), candidate)
        )
        risk = float(probabilities[action])
        return AgentDecision(
            action=action,
            source="neural",
            mine_risk=risk,
            rationale="selected the lowest learned mine-risk estimate among valid reveal actions",
        )

    def predict_probabilities(self, observation: np.ndarray, info: dict[str, Any]) -> np.ndarray:
        """Return one learned mine-risk estimate for every board cell."""

        if observation.ndim != 2:
            raise ValueError("observation must be a two-dimensional board matrix")
        tensor = self._torch.as_tensor(observation, dtype=self._torch.int8, device=self._device)
        extra_features = self._strategy_features(observation, tensor, info)
        with self._torch.inference_mode():
            logits = self._model(tensor.unsqueeze(0), extra_features).squeeze(0)
            return self._torch.sigmoid(logits).flatten().cpu().numpy()

    def _strategy_features(
        self,
        observation: np.ndarray,
        tensor: Any,
        info: dict[str, Any],
    ) -> Any | None:
        if not self._extra_channels:
            return None
        if "remaining_mines" not in info:
            raise ValueError("strategy-aware checkpoints require info['remaining_mines']")

        from sweeper.models.strategy import encode_strategy_features

        result = self._symbolic_solver.solve(observation)
        safe_mask = np.zeros(observation.shape, dtype=np.bool_)
        mine_mask = np.zeros(observation.shape, dtype=np.bool_)
        for row, column in result.safe_cells:
            safe_mask[row, column] = True
        for row, column in result.mine_cells:
            mine_mask[row, column] = True
        return encode_strategy_features(
            tensor.unsqueeze(0),
            self._torch.as_tensor(safe_mask, device=self._device).unsqueeze(0),
            self._torch.as_tensor(mine_mask, device=self._device).unsqueeze(0),
            self._torch.tensor([int(info["remaining_mines"])], device=self._device),
        )


def _inference_device(torch: Any, requested_device: str | None) -> Any:
    if requested_device is not None:
        return torch.device(requested_device)
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")
