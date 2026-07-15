# Minesweeper strategy playbook

This document turns human Minesweeper strategy into explicit Sweeper behavior. It is a design reference, not a claim that every technique is already implemented.

## Evidence labels

Every recommendation must state the strength of its evidence:

| label | meaning in Sweeper |
| --- | --- |
| `proven` | symbolic constraints force a cell to be safe or mined |
| `exact` | complete enumeration produced an exact mine probability |
| `approximate` | a bounded/sampled calculation estimated probability |
| `neural` | the CNN estimated probability from visible state |

Only `proven` moves may be described as safe. A learned-hybrid agent routes from symbolic proof, to exact enumeration, to a neural estimate when enumeration is outside its configured complexity limit.

## Patterns are constraint subtraction

The useful way to encode named patterns is not as a long list of image templates. Each revealed clue creates a constraint: a set of covered neighbouring cells and the number of mines among them. If constraint `A` is a subset of constraint `B`, then the non-overlapping cells `B − A` contain `mines(B) − mines(A)` mines.

That one rule explains the common visual patterns:

| familiar pattern | constraint interpretation | resulting action |
| --- | --- | --- |
| completed clue | remaining mines are `0` | every other covered neighbour is proven safe |
| completed neighbourhood | remaining mines equal the covered-neighbour count | every covered neighbour is a proven mine |
| `1-1-X` at an edge/corner | overlapping constraints both require one mine | the extra cell for the larger constraint is safe |
| `1-2-X` | the larger constraint needs one additional mine | its extra cell is a mine |
| `1-2-1` / `1-2-2-1` | repeated `1-2-X` and subtraction | forced mines at the ends and safe middle cells |
| irregular, T, or corner shapes | subset relation does not need a straight line | apply the same subtraction rule until a fixed point |

Sweeper’s `SymbolicSolver` already implements direct and subset deduction. New pattern examples should be added as solver tests with a proof object, rather than hard-coded special cases. The goal is that a human-recognizable pattern and an irregular equivalent receive the same explanation.

## First-click policy

First-click advice depends on the game contract, so Sweeper records it explicitly.

- The current engine uses `safe_first_click=True` by default: the chosen first cell cannot be a mine, but its neighbours are not promised to be clear.
- The board places mines after the first reveal, so the first action is reproducible for a given seed and selected cell.
- Some clients protect a larger zero-opening; others only protect the clicked cell. Comparisons across those variants are not valid unless the protection policy is reported.
- For learned experiments, avoid quietly treating a centre click, corner click, or large-opening guarantee as universal. Record the selected first action and train/evaluate under the same policy.

The current labeled-data generator starts from the centre of each beginner board. A future first-click experiment should compare centre, corner, and seeded-random policies under both safe-cell and zero-region guarantees, with separate seed ranges.

## Guessing is risk management

When no proof remains, a move is a decision under uncertainty—not a hidden proof.

1. Exhaust direct, subset, and chained symbolic deductions across the whole frontier.
2. Use exact component enumeration when it is tractable; choose the valid cell with the lowest exact mine probability.
3. Respect the global remaining-mine count, including unconstrained covered cells.
4. If exact enumeration is bounded, use the neural estimate or an explicitly approximate method and label it accordingly.
5. Break equal-risk ties by expected information gain only after measuring it; do not assume an opening is more valuable without an experiment.

This distinguishes a genuine 50:50 from a position where a distant constraint, the global mine count, or a subset relation still resolves the board. A no-guess board generator is a separate future mode: it must certify a proof-only path rather than merely make a good guess likely.

## Flags and no-flags play

Winning requires revealing every safe cell, not flagging every mine. Flags are useful for human memory and for chord controls, but they are not evidence.

Sweeper’s current Gym action space is reveal-only, so its agents are intentionally no-flags agents. This avoids letting an agent mistake its own marker for ground truth and matches the product objective of selecting safe reveals. If flag/chord actions are added later:

- require a `proven` mine or an exact probability of `1.0` before an automatic flag;
- never let a neural estimate trigger a flag automatically;
- expose the flag’s evidence and allow it to be removed;
- measure reveal actions, flags, chords, and wall-clock decision time separately.

## Efficiency has two meanings

Human speedplay efficiency is about mouse actions: skipping unnecessary flags, chording a satisfied clue that opens many cells, prioritizing likely openings, and avoiding needless cursor travel. The reference material uses 3BV as a lower bound on left-click work and discusses click efficiency relative to it.

Solver efficiency is different. For Sweeper, record at least:

- win/loss rate on shared seeds;
- reveal actions and total revealed cells;
- decision latency per move;
- solver fallback count and exact-enumeration coverage;
- future UI actions: flags, chords, pointer distance, and 3BV-normalized click count.

The environment already clears zero regions recursively, so one reveal action can expose many cells. Chording and UI-path metrics belong in a later interaction layer, not in the current solver benchmark.

## Source reading

This playbook synthesizes the requested human-strategy references:

- [advanced patterns](https://minesweepergame.com/strategy/patterns.php)
- [first click](https://minesweepergame.com/strategy/first-click.php)
- [guessing](https://minesweepergame.com/strategy/guessing.php)
- [no flags](https://minesweepergame.com/strategy/no-flags.php)
- [efficiency](https://minesweepergame.com/strategy/efficiency.php)

The patterns and no-flags/efficiency guidance is reflected in the symbolic-subset, reveal-only, and future chord metrics sections above. The project keeps first-click and guessing claims conditional on the engine’s documented game contract and recorded evaluation settings.
