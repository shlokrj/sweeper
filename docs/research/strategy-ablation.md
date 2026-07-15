# Strategy-channel ablation

## Question

Do symbolic safe and mine masks improve the CNN when all other training conditions are held constant?

## Control model

Train a standard CNN on `data/beginner-strategy-labels.npz`, the same archive used by the strategy-aware model. The control keeps the seeded-uniform first-click policy, 80 epochs, batch size 1024, board shape, mine count, and held-out seeds. It omits `--strategy-features`.

```bash
make train PYTHON=.venv/bin/python DATASET=data/beginner-strategy-labels.npz CHECKPOINT=artifacts/cnn-strategy-control.pt EPOCHS=80 BATCH_SIZE=1024
```

## Evaluation

Benchmark both checkpoints on seeds 20000 through 20499. Record calibration against each checkpoint's seed-disjoint validation split.

```bash
make benchmark PYTHON=.venv/bin/python CHECKPOINT=artifacts/cnn-strategy-control.pt REPORT=artifacts/benchmark-strategy-control.json BENCHMARK_GAMES=500 EVALUATION_SEED_START=20000
make calibrate PYTHON=.venv/bin/python DATASET=data/beginner-strategy-labels.npz CHECKPOINT=artifacts/cnn-strategy-control.pt CALIBRATION_REPORT=artifacts/calibration-strategy-control.json
```

Compare standalone CNN win rate, neural-hybrid win rate, Brier score, mean absolute error, and expected calibration error. Treat the result as evidence about the extra channels, not as a test of the full strategy playbook.

## Result

Both checkpoints trained on the same 20,000-board strategy-label archive and were evaluated on 500 beginner boards with seeds 20000 through 20499.

| Model | CNN win rate | Neural-hybrid win rate | Brier score | Mean absolute error | Expected calibration error |
| --- | ---: | ---: | ---: | ---: | ---: |
| shared-data control | 88.0% | 91.0% | 0.000949 | 0.00927 | 0.00122 |
| strategy-aware | 88.8% | 91.0% | 0.000460 | 0.00660 | 0.00179 |

The three strategy channels improve standalone beginner-board play by 0.8 percentage points. They reduce Brier score by 51.5% and mean absolute error by 28.8%. They do not improve the hybrid win rate. Expected calibration error is slightly worse, though both values are low.

The result supports keeping the strategy channels as an in-distribution probability feature. It does not support preferring that checkpoint over the control in the hybrid agent.
