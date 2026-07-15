# training handoff

The first trainable model is `MineProbabilityCNN`. It predicts one mine-risk logit per cell from the visible board and learns from exact probability labels, not hidden mine locations.

## overnight run

From the repository root, using the local virtual environment:

```bash
make install-train PYTHON=.venv/bin/python
make generate-data PYTHON=.venv/bin/python DATASET=data/beginner_labels.npz GAMES=20000
make train PYTHON=.venv/bin/python DATASET=data/beginner_labels.npz CHECKPOINT=artifacts/cnn.pt EPOCHS=80 BATCH_SIZE=1024
```

The generator uses 9×9 beginner boards with 10 mines by default. It retains only states whose exact probability labels are tractable under the configured component limit. The trainer splits states by whole board seed, so validation games never share a board with training games.

## symmetry-augmented retrain

The first follow-up experiment trains on a random rotation or reflection of each square training board. It keeps each observation, exact-probability target, and valid-cell mask aligned, while leaving validation states untouched. This adds board-orientation coverage without leaking validation seeds or producing another dataset archive.

```bash
make train PYTHON=.venv/bin/python DATASET=data/beginner_labels.npz CHECKPOINT=artifacts/cnn-augmented.pt EPOCHS=80 BATCH_SIZE=1024 TRAIN_FLAGS=--augment-symmetries
```

Use a new checkpoint path so the original CNN remains available as a reproducible baseline.

## outputs and device

- Dataset archives are written below ignored `data/`.
- Checkpoints are written below ignored `artifacts/`.
- Training uses Apple Metal (`mps`) when available, then CUDA, then CPU.
- Each epoch logs training and seed-disjoint validation binary-cross-entropy loss.

The smoke test has already completed a one-epoch, four-game run successfully. The commands above are the first meaningful long-running experiment; do not start them until you are ready to use the machine for training.

## held-out agent comparison

After training, compare the CNN with the random, local heuristic, symbolic, exact, hybrid, and neural-hybrid agents using one shared held-out seed range. The default range starts at `20000`, immediately after the `0` through `19999` training-data boards.

```bash
make benchmark PYTHON=.venv/bin/python CHECKPOINT=artifacts/cnn.pt REPORT=artifacts/benchmark.json BENCHMARK_GAMES=500 EVALUATION_SEED_START=20000
```

The ignored JSON report retains the configuration, exact seed list, per-game action replay, outcome, and timing for every agent. Neural decisions are reported as learned risk estimates, never as proof that a move is safe.
