# sweeper project structure

## layout

```text
sweeper/
├── configs/
│   ├── environment/       # board presets and environment behavior
│   ├── evaluation/        # benchmark suites and reporting settings
│   └── training/          # model and dataset experiment settings
├── docs/
│   ├── architecture/      # durable technical design records
│   ├── internal/          # ignored local agent, skill, and spec guidance
│   └── planning/          # roadmap and project-level planning documents
├── src/
│   └── sweeper/           # the Python package
│       ├── agents/        # random, heuristic, symbolic, exact, neural, hybrid
│       ├── data/          # dataset creation, loading, and transforms
│       ├── environment/   # board, game environment, generation, replay
│       ├── evaluation/    # benchmarks, metrics, and reports
│       ├── explanations/  # proof records and explanation rendering
│       ├── models/        # CNN, GNN, and model heads
│       ├── representation/ # tensors, graphs, and constraints
│       └── solvers/       # symbolic, enumeration, components, sampling
└── tests/
    ├── agents/            # agent behavior and selection tests
    ├── environment/       # board and environment invariants
    ├── evaluation/        # reproducibility and metric tests
    └── solvers/           # deduction and probability test cases
```

## folder rules

| folder | responsibility | must not contain |
| --- | --- | --- |
| `src/sweeper/environment` | game state, actions, and replay | agent strategy or hidden-state leaks in observations |
| `src/sweeper/agents` | choosing actions through stable solver/model interfaces | direct mutation of board internals |
| `src/sweeper/solvers` | constraints and mine-risk calculations | presentation or web concerns |
| `src/sweeper/representation` | conversions from visible board state | game-state ownership |
| `src/sweeper/evaluation` | seeded comparisons and metrics | environment-specific behavior |
| `src/sweeper/explanations` | evidence labels and human-readable traces | unverified claims of certainty |
| `src/sweeper/data` | labeled states and data transforms | one-off experiment results |
| `src/sweeper/models` | learnable architectures and losses | dataset splitting policy |
| `configs` | versionable run configuration | secrets or generated output |
| `tests` | automated checks that mirror package areas | production-only utilities |
| `docs` | decisions, plans, and technical references | generated experiment artifacts |

## naming conventions

- Use lowercase `snake_case` for Python modules and configuration files.
- Name a module after one responsibility: `board.py`, `replay.py`, `metrics.py`.
- Keep public package names singular when they represent one domain (`environment`, `evaluation`, `representation`) and plural when they hold many implementations (`agents`, `models`, `solvers`, `explanations`).
- Mirror source paths in tests: `src/sweeper/environment/board.py` pairs with `tests/environment/test_board.py`.
- Store only small, versioned examples in Git. Generated datasets, models, runs, and artifacts stay ignored.

## implementation order

The directory skeleton intentionally supports the full project without forcing premature implementation. Work begins in `src/sweeper/environment` and `tests/environment`; every other source area remains a reserved, clearly owned location until its roadmap phase starts.
