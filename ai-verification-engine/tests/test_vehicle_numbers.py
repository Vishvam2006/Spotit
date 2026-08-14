from app.normalization.vehicle_number import (
    normalize_vehicle_number,
    correct_ocr_vehicle_number,
    compare_vehicle_numbers,
)


def test_vehicle_number_normalization():
    assert normalize_vehicle_number("GJ01AB1234") == "GJ01AB1234"
    assert normalize_vehicle_number("GJ-01-AB-1234") == "GJ01AB1234"
    assert normalize_vehicle_number("GJ 01 AB 1234") == "GJ01AB1234"
    assert normalize_vehicle_number("gj.01.ab.1234") == "GJ01AB1234"


def test_ocr_confusion_correction():
    # O instead of 0 in digit section
    assert correct_ocr_vehicle_number("GJO1AB1234") == "GJ01AB1234"
    # I instead of 1 in digit section
    assert correct_ocr_vehicle_number("GJ0IAB1234") == "GJ01AB1234"
    # B instead of 8 in number section
    assert correct_ocr_vehicle_number("GJ01AB123B") == "GJ01AB1238"


def test_vehicle_number_comparison():
    is_match, norm1, norm2 = compare_vehicle_numbers("GJ-01-AB-1234", "GJ01AB1234")
    assert is_match is True

    # OCR corrected match
    is_match, norm1, norm2 = compare_vehicle_numbers("GJO1AB1234", "GJ01AB1234")
    assert is_match is True

    # Different registration numbers must fail
    is_match, norm1, norm2 = compare_vehicle_numbers("GJ01AB1234", "MH12CD5678")
    assert is_match is False
