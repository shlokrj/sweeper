# training handoff

The first trainable model is `MineProbabilityCNN`. It predicts one mine-risk logit per cell from the visible board and learns from exact probability labels, not hidden mine locations.

## overnight run

From the repository root, using the local virtual environment:

```bash
make install-train PYTHON=.venv/bin/python
make generate-data PYTHON=.venv/bin/python DATASET=data/beginner_labels.npz GAMES=20000
make train PYTHON=.venv/bin/python DATASET=data/beginner_labels.npz CHECKPOINT=artifacts/cnn.pt EPOCHS=80 BATCH_SIZE=256
```

The generator uses 9×9 beginner boards with 10 mines by default. It retains only states whose exact probability labels are tractable under the configured component limit. The trainer splits states by whole board seed, so validation games never share a board with training games.

## outputs and device

- Dataset archives are written below ignored `data/`.
- Checkpoints are written below ignored `artifacts/`.
- Training uses Apple Metal (`mps`) when available, then CUDA, then CPU.
- Each epoch logs training and seed-disjoint validation binary-cross-entropy loss.

The smoke test has already completed a one-epoch, four-game run successfully. The commands above are the first meaningful long-running experiment; do not start them until you are ready to use the machine for training.
