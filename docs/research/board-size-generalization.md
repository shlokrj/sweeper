# Board-size generalization

## Setup

The strategy-aware and shared-data control checkpoints were trained only on 9×9 beginner boards with 10 mines. Both use a fully convolutional architecture and can accept larger grids, but these tests measure zero-shot transfer rather than in-distribution performance.

Each model was evaluated on the same 500 seeds, 20000 through 20499. The hybrid agents used the same symbolic and exact routing settings as the beginner benchmark.

## Results

| Board | Agent | Shared-data control | Strategy-aware |
| --- | --- | ---: | ---: |
| intermediate, 16×16 with 40 mines | CNN | 9.8% | 0.0% |
| intermediate, 16×16 with 40 mines | neural-hybrid | 69.6% | 57.2% |
| intermediate, 16×16 with 40 mines | non-neural hybrid | 68.4% | 68.4% |
| expert, 16×30 with 99 mines | CNN | 0.0% | 0.0% |
| expert, 16×30 with 99 mines | neural-hybrid | 25.6% | 6.2% |
| expert, 16×30 with 99 mines | non-neural hybrid | 24.0% | 24.0% |

## Interpretation

Neither beginner-trained CNN transfers reliably to expert boards. The control adds a small gain to the hybrid agent on both larger presets. The strategy-aware checkpoint harms hybrid play by 12.4 points on intermediate boards and 18.8 points on expert boards.

This is a zero-shot baseline, not the current result for either larger preset. Separate in-distribution intermediate and expert studies now use matched archives, fixed held-out seeds, and calibration reports. See `docs/research/expert-experiment.md` for the expert result.

Use the original beginner strategy checkpoint only on 9×9 beginner boards. A future generalization study can test a mixed-size model or graph baseline against these zero-shot baselines.
