# training handoff

`MineProbabilityCNN` predicts one mine-risk logit per visible cell. It trains on exact probability labels, not hidden mine locations.

## overnight run

From the repository root, using the local virtual environment:

```bash
make install-train PYTHON=.venv/bin/python
make generate-data PYTHON=.venv/bin/python DATASET=data/beginner_labels.npz GAMES=20000
make train PYTHON=.venv/bin/python DATASET=data/beginner_labels.npz CHECKPOINT=artifacts/cnn.pt EPOCHS=80 BATCH_SIZE=1024
```

The generator creates 9×9 beginner boards with 10 mines. It keeps states whose exact labels fit the configured component limit. The trainer splits by board seed, so training and validation states never share a board.

## symmetry-augmented retrain

This experiment applies a random rotation or reflection to each square training board. It transforms the observation, exact-probability target, and valid-cell mask together. Validation states remain unchanged. The augmentation adds orientation coverage without generating another dataset archive.

```bash
make train PYTHON=.venv/bin/python DATASET=data/beginner_labels.npz CHECKPOINT=artifacts/cnn-augmented.pt EPOCHS=80 BATCH_SIZE=1024 TRAIN_FLAGS=--augment-symmetries
```

Use a new checkpoint path to retain the original CNN as a baseline.

## strategy-aware retrain

The strategy-aware model receives symbolic safe and mine masks plus the remaining-mine density. The masks come from visible constraints and encode the pattern and guessing rules in the strategy playbook. They do not expose hidden mines.

Generate labels from varied, reproducible first clicks, then train a separate checkpoint:

```bash
make generate-data PYTHON=.venv/bin/python DATASET=data/beginner-strategy-labels.npz GAMES=20000 INITIAL_CLICK=seeded_uniform
make train PYTHON=.venv/bin/python DATASET=data/beginner-strategy-labels.npz CHECKPOINT=artifacts/cnn-strategy.pt EPOCHS=80 BATCH_SIZE=1024 TRAIN_FLAGS='--strategy-features --mine-count 10'
```

Use the strategy data set for both training and calibration. The first-click policy remains part of the experiment configuration.

`--augment-symmetries` uses all eight rotations and reflections on square boards. On rectangular boards it uses identity, 180-degree rotation, horizontal reflection, and vertical reflection so tensor dimensions remain fixed.

## expert paired study

The expert study uses 16×30 boards with 99 mines. Train the control and strategy checkpoints from the same archive, then evaluate both on a separate 500-board seed range. The full protocol, commands, and decision gate are in `docs/research/expert-experiment.md`. The versioned settings are in `configs/training/expert.toml`.

## resume after interruption

New checkpoints store the current model, the best validation model, optimizer state, and completed epoch. Resume to the original total epoch count with the same checkpoint path:

```bash
make train PYTHON=.venv/bin/python DATASET=data/beginner-strategy-labels.npz CHECKPOINT=artifacts/cnn-strategy-control.pt EPOCHS=80 BATCH_SIZE=1024 TRAIN_FLAGS='--resume artifacts/cnn-strategy-control.pt'
```

Legacy checkpoints contain only model weights. Supply the last completed epoch when resuming one:

```bash
make train PYTHON=.venv/bin/python DATASET=data/beginner-strategy-labels.npz CHECKPOINT=artifacts/cnn-strategy-control.pt EPOCHS=80 BATCH_SIZE=1024 TRAIN_FLAGS='--resume artifacts/cnn-strategy-control.pt --resume-epoch 28'
```

## outputs and device

- Dataset archives are written below ignored `data/`.
- Checkpoints are written below ignored `artifacts/`.
- Training uses Apple Metal (`mps`) when available, then CUDA, then CPU.
- Each epoch logs training and seed-disjoint validation binary-cross-entropy loss.

The smoke test completed one epoch on four games. Full runs require the machine for the duration of training.

## held-out agent comparison

Compare the CNN with the random, local heuristic, symbolic, exact, hybrid, and neural-hybrid agents on one held-out seed range. The default range starts at `20000`, after the `0` through `19999` training-data boards.

```bash
make benchmark PYTHON=.venv/bin/python CHECKPOINT=artifacts/cnn.pt REPORT=artifacts/benchmark.json BENCHMARK_GAMES=500 EVALUATION_SEED_START=20000
```

The ignored JSON report stores the configuration, seed list, action replay, outcome, and timing for each agent. A neural decision is a learned risk estimate, not proof of safety.

## calibration report

Win rate does not measure whether a mine-risk estimate is accurate. Run calibration on seed-disjoint validation states after each training run:

```bash
make calibrate PYTHON=.venv/bin/python DATASET=data/beginner-strategy-labels.npz CHECKPOINT=artifacts/cnn-strategy.pt CALIBRATION_REPORT=artifacts/calibration-strategy.json
```

The report records Brier score, mean absolute error, expected calibration error, and per-bin predicted and exact mine probabilities.

## compact preset summary

After paired runs finish, create one smaller JSON summary without per-game traces. This becomes the stable input for research notes and the web interface.

```bash
.venv/bin/python -m sweeper.reporting \
  --preset expert \
  --label control --benchmark artifacts/benchmark-expert-control.json --calibration artifacts/calibration-expert-control.json \
  --label strategy --benchmark artifacts/benchmark-expert-strategy.json --calibration artifacts/calibration-expert-strategy.json \
  --output artifacts/summary-expert.json
```
