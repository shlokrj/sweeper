# Minesweeper strategy playbook

This reference maps human Minesweeper strategy to Sweeper behavior. It distinguishes implemented behavior from planned work.

## Evidence labels

Every recommendation must state the strength of its evidence:

| label | meaning in Sweeper |
| --- | --- |
| `proven` | symbolic constraints force a cell to be safe or mined |
| `exact` | complete enumeration produced an exact mine probability |
| `approximate` | a bounded/sampled calculation estimated probability |
| `neural` | the CNN estimated probability from visible state |

Only `proven` moves may be called safe. The learned-hybrid agent uses symbolic proof first, then exact enumeration, then a neural estimate when enumeration reaches its complexity limit.

## Patterns are constraint subtraction

Each revealed clue creates a constraint: a set of covered neighbours and a mine count. If constraint `A` is a subset of constraint `B`, the cells in `B − A` contain `mines(B) − mines(A)` mines.

This rule explains the common visual patterns:

| familiar pattern | constraint interpretation | resulting action |
| --- | --- | --- |
| completed clue | remaining mines are `0` | every other covered neighbour is proven safe |
| completed neighbourhood | remaining mines equal the covered-neighbour count | every covered neighbour is a proven mine |
| `1-1-X` at an edge/corner | overlapping constraints both require one mine | the extra cell for the larger constraint is safe |
| `1-2-X` | the larger constraint needs one additional mine | its extra cell is a mine |
| `1-2-1` / `1-2-2-1` | repeated `1-2-X` and subtraction | forced mines at the ends and safe middle cells |
| irregular, T, or corner shapes | subset relation does not need a straight line | apply the same subtraction rule until a fixed point |

`SymbolicSolver` implements direct and subset deduction. Add new pattern examples as solver tests with proof objects, not as hard-coded templates. A named pattern and an irregular equivalent should produce the same proof.

## First-click policy

First-click policy depends on the game contract and must be recorded.

- The current engine uses `safe_first_click=True` by default. The chosen cell cannot be a mine, but adjacent cells may contain mines.
- The board places mines after the first reveal, so the first action is reproducible for a given seed and selected cell.
- Some clients protect a zero region. Others protect only the clicked cell. Do not compare these variants without reporting the protection policy.
- Record the first action for every learned experiment. Train and evaluate under the same first-click policy.

The labeled-data generator starts from the centre of each beginner board. A future experiment should compare centre, corner, and seeded-random policies under safe-cell and zero-region guarantees on separate seed ranges.

## Guessing is risk management

When no proof remains, the move is a risk decision.

1. Exhaust direct, subset, and chained symbolic deductions across the whole frontier.
2. Use exact component enumeration when it fits the configured limit. Choose the valid cell with the lowest exact mine probability.
3. Respect the global remaining-mine count, including unconstrained covered cells.
4. If exact enumeration is bounded, use the neural estimate or an explicitly approximate method and label it accordingly.
5. Use expected information gain for equal-risk ties only after measuring it.

This separates a genuine 50:50 from a board still resolved by a distant constraint, the global mine count, or a subset relation. A future no-guess generator must certify a proof-only solution path.

## Flags and no-flags play

Winning requires revealing every safe cell. Flags support human memory and chord controls, but they are not evidence.

The current Gym action space is reveal-only. Agents do not flag cells. This prevents an agent from treating its own marker as ground truth. If flag or chord actions are added:

- require a `proven` mine or exact probability `1.0` before an automatic flag
- never allow a neural estimate to trigger an automatic flag
- record the evidence for every flag and allow it to be removed
- measure reveal actions, flags, chords, and decision time separately

## Efficiency has two meanings

Human speedplay efficiency concerns mouse actions. It includes skipping unnecessary flags, chording a satisfied clue that opens many cells, and limiting cursor travel. The reference material uses 3BV as a lower bound on left-click work.

Solver efficiency is different. For Sweeper, record at least:

- win and loss rate on shared seeds
- reveal actions and total revealed cells
- decision latency per move
- solver fallback count and exact-enumeration coverage
- future UI actions, flags, chords, pointer distance, and 3BV-normalized click count

The environment clears zero regions recursively, so one reveal action can expose many cells. Chording and UI-path metrics belong in a later interaction layer.

## Source reading

This playbook synthesizes the requested human-strategy references:

- [advanced patterns](https://minesweepergame.com/strategy/patterns.php)
- [first click](https://minesweepergame.com/strategy/first-click.php)
- [guessing](https://minesweepergame.com/strategy/guessing.php)
- [no flags](https://minesweepergame.com/strategy/no-flags.php)
- [efficiency](https://minesweepergame.com/strategy/efficiency.php)

Patterns, no-flags play, and efficiency map to symbolic subtraction, reveal-only actions, and future chord metrics. First-click and guessing claims remain conditional on the documented game contract and evaluation settings.
