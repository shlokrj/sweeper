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
