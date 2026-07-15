import numpy as np
import pytest

from sweeper.models.calibration import calibration_report


def test_calibration_report_measures_soft_probability_error() -> None:
    report = calibration_report(
        np.asarray([0.1, 0.9]),
        np.asarray([0.0, 1.0]),
        bin_count=2,
    )

    assert report.count == 2
    assert report.brier_score == pytest.approx(0.01)
    assert report.mean_absolute_error == pytest.approx(0.1)
    assert report.expected_calibration_error == pytest.approx(0.1)
    assert tuple(bin.count for bin in report.bins) == (1, 1)
