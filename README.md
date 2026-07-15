# sweeper

Sweeper is a research-oriented, neuro-symbolic Minesweeper system. It will compare deterministic constraint reasoning, exact probability inference, learned models, and a hybrid agent—while making every move understandable.

## what we are trying to learn

1. Can learned models generalize Minesweeper deductions instead of memorizing board layouts?
2. Does combining symbolic, exact, and learned reasoning beat any one method alone?
3. Can each recommendation clearly distinguish proof, calculation, and prediction?

## the product

The finished project will provide a custom Minesweeper environment, competing agents, reproducible benchmarks, faithful explanations, and a web interface for playing games and inspecting agent decisions.

Users will be able to choose a human, symbolic, probability, neural, or hybrid mode and inspect:

- the chosen move and its confidence
- mine-probability heatmaps
- active logical constraints
- proof or decision trace
- a full game replay

## build order

The project deliberately starts with reliable foundations:

1. **environment** — deterministic board generation, reveals, flags, replay, and tests.
2. **baselines** — random and local-risk agents with a seeded evaluation harness.
3. **reasoning** — symbolic deductions, exact frontier probabilities, and proof objects.
4. **data and learning** — labeled state generation, CNN/GNN baselines, and generalization tests.
5. **hybrid and product** — solver routing, explanations, benchmarks, and an interactive web app.

The first implementation target is the custom game engine and its test suite. Advanced items such as reinforcement learning, Google Minesweeper overlays, and screenshot parsing remain explicitly out of the initial scope.

## current planning artifacts

- [roadmap](docs/planning/roadmap.md) — milestones, deliverables, and acceptance checks.
- [project structure](docs/planning/project-structure.md) — the purpose of every top-level folder and the planned package layout.
- Local `docs/internal/agent.md`, `docs/internal/skills.md`, and `docs/internal/spec.md` files — working guidance for the active project; these are intentionally ignored and never committed.

## principles

- Reproducibility is a feature: board seeds, action traces, and benchmark configuration are first-class data.
- Ground-truth mines and player-visible state stay separate.
- A neural estimate is never presented as a mathematical guarantee.
- Every agent is evaluated on the same seeded boards.

See the [project roadmap](docs/planning/roadmap.md) for the staged outline.
