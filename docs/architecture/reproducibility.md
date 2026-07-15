# reproducibility policy

## seed convention

- Public simulation and evaluation entry points accept `seed: int | None`.
- A supplied seed must reproduce the same board, action sequence, and result when configuration is unchanged.
- Derive episode seeds from a recorded base seed and episode index; do not rely on module-level random state.
- Keep Python and NumPy random generators explicit and local to the component that owns them.

## experiment record

Every benchmark or training run records the package version, configuration, base seed, board seeds, agent name, runtime, and complete action trace. Generated outputs belong under ignored root-level `artifacts/` or `data/` directories.

## test policy

- Tests use explicit, stable seeds whenever randomness is involved.
- Unit tests cover a single invariant; property tests cover generated action sequences and board configurations.
- A failing randomized test must retain the failing seed or Hypothesis example so it can be replayed.
- Run `make check` before committing a change. Run `make format` before it when formatting may be affected.
