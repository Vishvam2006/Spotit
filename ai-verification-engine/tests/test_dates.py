from datetime import date
from app.normalization.date import normalize_date, is_valid_dob


def test_date_normalization_formats():
    assert normalize_date("12/04/2005") == "2005-04-12"
    assert normalize_date("12-04-2005") == "2005-04-12"
    assert normalize_date("12.04.2005") == "2005-04-12"
    assert normalize_date("2005-04-12") == "2005-04-12"
    assert normalize_date("12 APR 2005") == "2005-04-12"
    assert normalize_date("12 APRIL 2005") == "2005-04-12"


def test_invalid_date_normalization():
    assert normalize_date("31/02/2005") is None  # Invalid Feb 31
    assert normalize_date("invalid-date") is None
    assert normalize_date("") is None


def test_dob_validation():
    ref_date = date(2026, 8, 12)

    # Valid past DOB
    assert is_valid_dob("12/04/2005", current_date=ref_date) is True
    assert is_valid_dob("2005-04-12", current_date=ref_date) is True

    # Future DOB must be rejected
    assert is_valid_dob("12/04/2030", current_date=ref_date) is False

    # Year < 1900 rejected
    assert is_valid_dob("12/04/1850", current_date=ref_date) is False
