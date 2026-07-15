# Strategy-aware CNN result

## Evaluation setup

The strategy-aware CNN trained for 80 epochs on 20,000 beginner boards with a seeded-uniform first-click policy. It received three extra input channels derived from visible information:

- symbolic safe-cell mask
- symbolic mine-cell mask
- remaining-mine density

The held-out evaluation used 500 fixed beginner-board seeds from 20000 through 20499.

## Held-out win rates

| Agent | Win rate | Average moves |
| --- | ---: | ---: |
| symbolic | 87.6% | 19.2 |
| exact | 86.2% | 18.6 |
| hybrid | 90.6% | 19.7 |
| augmented CNN | 88.6% | 19.2 |
| strategy-aware CNN | 88.8% | 19.2 |
| augmented CNN hybrid | 90.6% | 19.6 |
| strategy-aware CNN hybrid | 91.0% | 19.7 |

The strategy-aware CNN gained 0.2 percentage points as a standalone agent. Its neural-hybrid gained 0.4 percentage points.

## Calibration

| Model | Brier score | Mean absolute error | Expected calibration error |
| --- | ---: | ---: | ---: |
| augmented CNN | 0.000770 | 0.00938 | 0.00285 |
| strategy-aware CNN | 0.000460 | 0.00660 | 0.00179 |

The strategy-aware model produced lower probability error on its seed-disjoint validation data.

## Limitation

The augmented and strategy-aware models used different label archives. The strategy archive varied first clicks and added symbolic channels. The next experiment holds the archive, optimizer, epoch count, batch size, and held-out seeds constant while removing only the extra channels.
