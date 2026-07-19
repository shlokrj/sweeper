# Sweeper

Sweeper studies Minesweeper decision-making with symbolic proofs, exact mine probabilities, and CNN risk estimates. The browser demo is a playable client-side board with manual, assisted, and auto modes.

## Findings

Every comparison uses shared held-out board seeds. Training and validation split by whole board seed, not by board state.

| Study | Board | Held-out result |
| --- | --- | --- |
| beginner | 9 × 9, 10 mines, 500 boards | strategy CNN hybrid: **91.0%** win rate, compared with **90.6%** for the non-neural hybrid |
| intermediate | 16 × 16, 40 mines, 500 boards | strategy CNN: **71.2%**, control CNN: **66.0%**; strategy hybrid: **75.4%**, control hybrid: **74.8%** |
| expert, primary | 16 × 30, 99 mines, 500 boards | control hybrid: **32.0%**, strategy hybrid: **29.6%**, non-neural hybrid: **24.6%** |
| expert, independent confirmation | 16 × 30, 99 mines, 500 boards | control hybrid: **35.4%**, strategy hybrid: **31.4%**, non-neural hybrid: **20.0%** |

The beginner study found a 0.4 percentage-point hybrid gain from the strategy-aware CNN. The shared-data beginner ablation found no hybrid win-rate difference between control and strategy models, but the strategy model reduced Brier score from 0.000949 to 0.000460.

On intermediate boards, the strategy model improved standalone win rate by 5.2 points and hybrid win rate by 0.6 points. It also reduced Brier score from 0.000259 to 0.000201 and expected calibration error from 0.001483 to 0.000468.

On expert boards, the control model produced the best autonomous play. The strategy model produced better calibrated mine-risk estimates on the same archive, with Brier score 0.0000223 versus 0.0000312 and expected calibration error 0.000136 versus 0.000224. Both learned hybrids cleared the predefined expert decision gate. Full protocols and limits are in [the research notes](docs/research/).

## Method

Visible state uses `-2` for flags, `-1` for covered cells, and `0..8` for revealed clues. The engine keeps hidden mines separate from observations. The hybrid agent routes guaranteed moves through symbolic proofs, uses exact probabilities on tractable frontiers, then falls back to a learned mine-risk estimate.

## Stack

| Area | Tools |
| --- | --- |
| engine and research code | Python, NumPy, Gymnasium |
| symbolic and exact solving | constraint propagation, subset reasoning, component enumeration |
| learned risk estimation | PyTorch CNNs with optional strategy feature channels |
| evaluation | shared seeded benchmarks, calibration reports, compact result summaries |
| quality | pytest, Hypothesis, Ruff |
| web | React, TypeScript, Vinext, Cloudflare Workers, CSS |

## Repository

| Path | Contents |
| --- | --- |
| `src/sweeper/` | engine, agents, solvers, models, evaluation, and reporting |
| `tests/` | deterministic unit, property, and CLI tests |
| `configs/` | versioned environment, training, and evaluation settings |
| `docs/research/` | study protocols, ablations, and results |
| `web/` | playable demo and benchmark interface |

Generated datasets and checkpoints stay in ignored `data/` and `artifacts/` directories. The public repository contains no credentials, user data, or trained checkpoint files.

## Verify

```bash
python -m pip install -e ".[dev]"
make check

cd web
npm ci
npm run lint
npm test
```

The optional training dependency is available through `python -m pip install -e ".[train]"`.

## License

[MIT](LICENSE)
