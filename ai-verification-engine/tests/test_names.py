from app.normalization.name import normalize_name, compare_names


def test_name_normalization():
    assert normalize_name("Aryan Patel") == "ARYAN PATEL"
    assert normalize_name("  ARYAN   PATEL  ") == "ARYAN PATEL"
    assert normalize_name("Aryan-Patel") == "ARYAN PATEL"
    assert normalize_name("ARYAN, PATEL.") == "ARYAN PATEL"


def test_name_comparison_exact_and_fuzzy():
    # Case insensitive match
    is_match, score = compare_names("Aryan Patel", "ARYAN PATEL")
    assert is_match is True
    assert score == 1.0

    # Spacing variance match
    is_match, score = compare_names("ARYAN  PATEL", "ARYAN PATEL")
    assert is_match is True
    assert score == 1.0

    # Minor typo/OCR noise match (e.g. single character)
    is_match, score = compare_names("ARYAN PATELL", "ARYAN PATEL")
    assert is_match is True
    assert score >= 0.90

    # Distinct names must fail
    is_match, score = compare_names("ARYAN PATEL", "RAHUL SHARMA")
    assert is_match is False
    assert score < 0.50


def test_name_comparison_empty():
    is_match, score = compare_names("", "ARYAN PATEL")
    assert is_match is False
    assert score == 0.0
