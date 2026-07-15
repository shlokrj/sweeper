# sweeper roadmap

## project direction

Sweeper investigates how symbolic logic, exact probabilistic inference, and learned models solve Minesweeper—individually and together. The roadmap favors measurable, reproducible progress: each stage exposes a stable interface and an observable success condition before the next begins.

## phase 0 — foundations

**Goal:** make the project easy to run, test, and reproduce before implementing game logic.

**Deliverables**

- Python project metadata and a clear development setup
- formatting, linting, and test commands
- a seed convention and deterministic-test policy
- initial package layout for the environment and tests

**Done when:** a clean checkout can install dependencies and run a passing empty test suite through one documented command.

## phase 1 — custom Minesweeper environment

**Goal:** implement a fast, deterministic game engine independent of any external site.

**Deliverables**

- `MinesweeperBoard` with separate hidden mines and visible cells
- seeded and random board generation, including standard presets
- safe first reveal, zero-region clearing, flags, win/loss states, and remaining-mine count
- a Gymnasium-style `reset()` / `step(action)` environment surface
- valid-action masking, board serialization, replay records, and a terminal renderer
- unit and property tests for engine invariants

**Core contract**

Visible cells use `-2` for flagged, `-1` for covered, and `0..8` for revealed clues. A reveal action is a flattened index (`row * columns + column`) in the first version. Ground truth must never leak through observations.

**Done when:** identical seeds and actions reproduce the same game, invalid actions are handled consistently, and a long seeded simulation completes without invariant failures.

## phase 2 — baseline agents and measurement

**Goal:** establish a fair baseline before adding sophisticated reasoning.

**Deliverables**

- random valid-move agent
- local-risk heuristic agent
- global-density fallback when no clue supplies local information
- shared evaluator that runs identical seed sets for every agent
- per-game action traces and aggregate metrics

**Done when:** two baseline agents can be compared repeatably on the same board collection with win rate, completion, move count, and decision latency reported.

## phase 3 — symbolic reasoning

**Goal:** turn visible clues into correct, inspectable deductions.

**Deliverables**

- constraint extraction from revealed clues
- direct safe and direct mine rules
- constraint reduction and subset reasoning
- fixed-point propagation loop
- proof objects that identify the rule and supporting constraints
- a library of known local and chained deduction tests

**Done when:** all pattern tests pass and each guaranteed recommendation has a machine-readable proof.

## phase 4 — exact probabilities

**Goal:** calculate mine risk precisely when logic cannot force a move.

**Deliverables**

- frontier detection and independent-component decomposition
- pruned backtracking enumeration
- per-cell probability and valid-configuration counts
- global remaining-mine adjustment
- predictable fallback boundary for oversized components

**Done when:** probabilities match manually verified small positions and always obey all active constraints.

## later phases

1. Generate seed-disjoint labeled datasets from engine trajectories.
2. Train CNN and graph-based probability baselines.
3. Evaluate board-size, transformation, withheld-pattern, and reasoning-depth generalization.
4. Route between symbolic, exact, and learned solvers in a hybrid agent.
5. Build faithful explanations, benchmarks, replay tooling, and the web experience.

## scope guardrails

Start with the environment, baselines, and symbolic/exact solvers. Reinforcement learning, automated learned-rule discovery, Google Minesweeper integration, and screenshot parsing are optional research extensions—not prerequisites for a useful first release.

## evaluation rules

- Compare agents on the exact same board seeds.
- Split generated datasets by whole game seed, never by individual board state.
- Record configuration, seed, version, runtime, and full decision trace for each experiment.
- Label explanations as `proven`, `exact`, `approximate`, or `neural`; never blur those categories.
