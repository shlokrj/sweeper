"""Small local HTTP service for the checkpoints selected by the preset studies.

The browser sends only the visible board state. The service returns one reveal
action and its evidence, never a hidden board or a flag action.
"""

from __future__ import annotations

import argparse
import json
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np

from sweeper.agents import NeuralHybridAgent
from sweeper.agents.base import Agent, AgentDecision
from sweeper.presets import ModelPurpose, PresetPolicy, preset_for_board

PROJECT_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class MoveRequest:
    """A validated visible board sent by the local demo."""

    rows: int
    columns: int
    mines: int
    remaining_mines: int
    purpose: ModelPurpose
    observation: np.ndarray

    @classmethod
    def from_payload(cls, payload: Mapping[str, object]) -> MoveRequest:
        """Build a request while rejecting shapes and values the agents cannot read."""

        rows = _integer(payload, "rows", minimum=1)
        columns = _integer(payload, "columns", minimum=1)
        mines = _integer(payload, "mines", minimum=0)
        remaining_mines = _integer(payload, "remaining_mines", minimum=0)
        if remaining_mines > mines:
            raise ValueError("remaining_mines cannot exceed mines")

        raw_mode = payload.get("mode")
        if raw_mode == "auto":
            purpose = ModelPurpose.AUTOPLAY
        elif raw_mode == "assisted":
            purpose = ModelPurpose.ASSISTED
        else:
            raise ValueError("mode must be 'assisted' or 'auto'")

        raw_board = payload.get("board")
        if not isinstance(raw_board, list) or len(raw_board) != rows * columns:
            raise ValueError("board must contain one visible value for every board cell")
        if any(isinstance(value, bool) or not isinstance(value, int) for value in raw_board):
            raise ValueError("board values must be integers")
        if any(value < -2 or value > 8 for value in raw_board):
            raise ValueError("board values must be between -2 and 8")

        observation = np.asarray(raw_board, dtype=np.int8).reshape(rows, columns)
        if not np.any(observation == -1):
            raise ValueError("board has no covered cells available to reveal")
        return cls(rows, columns, mines, remaining_mines, purpose, observation)


@dataclass(frozen=True)
class MoveResponse:
    """One model-backed reveal recommendation suitable for JSON serialization."""

    action: int
    source: str
    mine_risk: float | None
    rationale: str
    preset: str

    @classmethod
    def from_decision(cls, decision: AgentDecision, policy: PresetPolicy) -> MoveResponse:
        return cls(
            action=decision.action,
            source=decision.source,
            mine_risk=decision.mine_risk,
            rationale=decision.rationale,
            preset=policy.name,
        )

    def as_payload(self) -> dict[str, object]:
        return {
            "action": self.action,
            "source": self.source,
            "mine_risk": self.mine_risk,
            "rationale": self.rationale,
            "preset": self.preset,
        }


AgentFactory = Callable[..., Agent]


class ModelMoveService:
    """Cache the study-selected hybrid agent for each requested play mode."""

    def __init__(
        self,
        *,
        artifact_root: Path = PROJECT_ROOT,
        agent_factory: AgentFactory = NeuralHybridAgent,
        device: str | None = None,
    ) -> None:
        self._artifact_root = artifact_root
        self._agent_factory = agent_factory
        self._device = device
        self._agents: dict[tuple[ModelPurpose, Path], Agent] = {}

    def move(self, payload: Mapping[str, object]) -> MoveResponse:
        """Choose one allowed reveal action from a browser-visible board state."""

        request = MoveRequest.from_payload(payload)
        policy = preset_for_board(request.rows, request.columns, request.mines)
        checkpoint = self._checkpoint_for(policy, request.purpose)
        key = (request.purpose, checkpoint)
        agent = self._agents.get(key)
        if agent is None:
            agent = self._agent_factory(
                checkpoint,
                max_component_size=policy.max_component_size,
                device=self._device,
            )
            self._agents[key] = agent

        action_mask = (request.observation.ravel() == -1).astype(np.bool_)
        decision = agent.select_action(
            request.observation,
            {
                "action_mask": action_mask,
                "mine_count": request.mines,
                "remaining_mines": request.remaining_mines,
            },
        )
        if not action_mask[decision.action]:
            raise ValueError("selected model action is not an unflagged covered cell")
        return MoveResponse.from_decision(decision, policy)

    def _checkpoint_for(self, policy: PresetPolicy, purpose: ModelPurpose) -> Path:
        checkpoint = policy.checkpoint_for(purpose)
        return checkpoint if checkpoint.is_absolute() else self._artifact_root / checkpoint


class ModelRequestHandler(BaseHTTPRequestHandler):
    """Serve the small local JSON API used by the demo page."""

    server: ModelHTTPServer

    def do_GET(self) -> None:  # noqa: N802
        if self.path != "/health":
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return
        self._send_json(HTTPStatus.OK, {"status": "ok"})

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/move":
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return
        try:
            length = _content_length(self.headers.get("Content-Length"))
            raw_payload = self.rfile.read(length)
            payload = json.loads(raw_payload)
            if not isinstance(payload, dict):
                raise ValueError("request body must be a JSON object")
            response = self.server.move_service.move(payload)
        except (json.JSONDecodeError, ValueError) as error:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return
        except (FileNotFoundError, RuntimeError) as error:
            self._send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(error)})
            return
        self._send_json(HTTPStatus.OK, response.as_payload())

    def log_message(self, format: str, *arguments: object) -> None:
        """Keep normal local requests quiet while preserving server errors."""

        del format, arguments

    def _send_json(self, status: HTTPStatus, payload: Mapping[str, object]) -> None:
        encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "http://localhost:3000")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")


class ModelHTTPServer(ThreadingHTTPServer):
    """HTTP server carrying one shared model service instance."""

    def __init__(self, address: tuple[str, int], move_service: ModelMoveService) -> None:
        super().__init__(address, ModelRequestHandler)
        self.move_service = move_service


def _integer(payload: Mapping[str, object], name: str, *, minimum: int) -> int:
    value = payload.get(name)
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise ValueError(f"{name} must be an integer of at least {minimum}")
    return value


def _content_length(value: str | None) -> int:
    if value is None:
        raise ValueError("Content-Length is required")
    try:
        length = int(value)
    except ValueError as error:
        raise ValueError("Content-Length must be an integer") from error
    if not 0 <= length <= 1_000_000:
        raise ValueError("Content-Length is outside the allowed range")
    return length


def main() -> None:
    """Run the local model service for the interactive demo."""

    parser = argparse.ArgumentParser(description="serve Sweeper's selected local model checkpoints")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--device")
    arguments = parser.parse_args()

    server = ModelHTTPServer(
        (arguments.host, arguments.port),
        ModelMoveService(device=arguments.device),
    )
    print(f"Sweeper model service listening on http://{arguments.host}:{arguments.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":  # pragma: no cover - exercised through the module command
    main()
