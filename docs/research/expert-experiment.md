# Expert preset experiment

## Question

Do expert-board training and the three strategy channels improve calibrated risk estimates and hybrid play on 16×30 boards with 99 mines?

## Fixed configuration

The versioned settings are in `configs/training/expert.toml`.

| Split | Seeds | Purpose |
| --- | --- | --- |
| pilot | 80000 through 84999 | Measure label yield and runtime only |
| training archive | 90000 through 109999 | Train and validate both models |
| held-out benchmark | 120000 through 120499 | Compare every agent on 500 expert boards |

The archive uses seeded-uniform first clicks, 200 maximum moves, and an exact-component limit of 18. Training and validation split by whole board seed. The 16×30 board uses shape-preserving identity, 180-degree rotation, horizontal reflection, and vertical reflection during training.

## Paired models

Train both models from the same archive and optimizer settings. The only difference is the three symbolic strategy channels.

```bash
caffeinate -i .venv/bin/python -m sweeper.models.train \
  --dataset artifacts/expert-labels.npz \
  --checkpoint artifacts/cnn-expert-control.pt \
  --epochs 80 --batch-size 256 --mine-count 99 --seed 0 \
  --augment-symmetries

caffeinate -i .venv/bin/python -m sweeper.models.train \
  --dataset artifacts/expert-labels.npz \
  --checkpoint artifacts/cnn-expert-strategy.pt \
  --epochs 80 --batch-size 256 --mine-count 99 --seed 0 \
  --augment-symmetries --strategy-features
```

## Evaluation

Calibrate each checkpoint on its seed-disjoint validation states. Benchmark the control and strategy checkpoints on the same held-out expert seeds.

```bash
caffeinate -i .venv/bin/python -m sweeper.models.evaluate \
  --dataset artifacts/expert-labels.npz \
  --checkpoint artifacts/cnn-expert-control.pt \
  --output artifacts/calibration-expert-control.json --mine-count 99

caffeinate -i .venv/bin/python -m sweeper.evaluation \
  --checkpoint artifacts/cnn-expert-control.pt \
  --output artifacts/benchmark-expert-control.json \
  --rows 16 --columns 30 --mines 99 --games 500 --seed-start 120000 \
  --max-component-size 18
```

Repeat both commands with the strategy checkpoint and corresponding output paths.

## Decision gate

Keep a learned expert policy only if its neural-hybrid win rate exceeds the non-neural hybrid by at least two percentage points on the shared 500-board test and its Brier score improves. Otherwise, keep the symbolic and exact hybrid as the expert default.

If neither expert model passes, the next experiment is a mixed-size model or a graph baseline. Do not treat a beginner or intermediate win rate as evidence for expert performance.
