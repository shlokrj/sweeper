"""Calibration metrics for mine-probability predictions."""

from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np


@dataclass(frozen=True)
class CalibrationBin:
    """Observed and predicted mine frequency within one probability interval."""

    lower_bound: float
    upper_bound: float
    count: int
    mean_prediction: float | None
    mean_target: float | None


@dataclass(frozen=True)
class CalibrationReport:
    """Probability error and calibration summaries over exact soft labels."""

    count: int
    brier_score: float
    mean_absolute_error: float
    expected_calibration_error: float
    bins: tuple[CalibrationBin, ...]

    def as_dict(self) -> dict[str, object]:
        """Return a JSON-ready representation."""

        return asdict(self)


def calibration_report(
    probabilities: np.ndarray,
    targets: np.ndarray,
    *,
    bin_count: int = 10,
) -> CalibrationReport:
    """Measure calibration against exact probability labels."""

    probabilities = np.asarray(probabilities, dtype=np.float64).reshape(-1)
    targets = np.asarray(targets, dtype=np.float64).reshape(-1)
    if probabilities.shape != targets.shape or not len(probabilities):
        raise ValueError("probabilities and targets must be non-empty arrays of equal shape")
    if bin_count <= 0:
        raise ValueError("bin_count must be positive")
    if not (np.isfinite(probabilities).all() and np.isfinite(targets).all()):
        raise ValueError("probabilities and targets must be finite")
    if not ((0.0 <= probabilities).all() and (probabilities <= 1.0).all()):
        raise ValueError("probabilities must be between zero and one")
    if not ((0.0 <= targets).all() and (targets <= 1.0).all()):
        raise ValueError("targets must be between zero and one")

    bins: list[CalibrationBin] = []
    expected_calibration_error = 0.0
    for index in range(bin_count):
        lower_bound = index / bin_count
        upper_bound = (index + 1) / bin_count
        in_bin = (probabilities >= lower_bound) & (
            probabilities <= upper_bound if index == bin_count - 1 else probabilities < upper_bound
        )
        count = int(in_bin.sum())
        if not count:
            bins.append(CalibrationBin(lower_bound, upper_bound, 0, None, None))
            continue
        mean_prediction = float(probabilities[in_bin].mean())
        mean_target = float(targets[in_bin].mean())
        expected_calibration_error += (
            count / len(probabilities) * abs(mean_prediction - mean_target)
        )
        bins.append(
            CalibrationBin(
                lower_bound,
                upper_bound,
                count,
                mean_prediction,
                mean_target,
            )
        )

    return CalibrationReport(
        count=len(probabilities),
        brier_score=float(np.mean((probabilities - targets) ** 2)),
        mean_absolute_error=float(np.mean(np.abs(probabilities - targets))),
        expected_calibration_error=expected_calibration_error,
        bins=tuple(bins),
    )
