# environment contract

`MinesweeperEnv` adapts `MinesweeperBoard` to the Gymnasium API while keeping the board as the sole owner of hidden mines.

## interface

```python
env = MinesweeperEnv(rows=9, columns=9, mine_count=10)
observation, info = env.reset(seed=42)
observation, reward, terminated, truncated, info = env.step(action)
```

- `action` is a flattened reveal index: `row * columns + column`.
- `observation` is an `int8` matrix with the board's `-2`, `-1`, and `0..8` visible-cell encoding.
- `info["action_mask"]` is a flattened boolean array marking revealable cells.
- Invalid, previously revealed, flagged, or out-of-range actions raise an error instead of silently changing the game.
- Every new safe cell returns `+1` reward. Selecting a mine returns `-1`.
- A game result sets `terminated=True`. The environment does not impose truncation.

## reproducibility and replay

Calling `reset(seed=...)` records the seed used to construct the board. Every `replay_events` entry records that episode seed plus the reset or reveal action, coordinate, reward, outcome, status, and resulting visible state. A future replay serializer can use the fixed environment configuration, episode seed, and event actions to reconstruct a random-board episode.

## current boundary

The wrapper exposes reveal actions only. Flag actions, render modes, serialization, and batch environments remain later additions.
