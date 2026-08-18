"""
Confidence is computed, not asserted by the model.

The old engine prompted for a self-reported score of 0.70-1.00 for any valid
document and then used >= 0.70 as the pass threshold -- a check that could not
fail. These tests pin the replacement to real signals.
"""

from app.models.schemas import CheckStatus as C
from app.verification.confidence import compute_confidence, confidence_label


def build(**overrides):
    kwargs = dict(
        fields_found=4, fields_required=4, raw_values=4, normalized_values=4,
        check_statuses=[C.MATCH, C.MATCH, C.VALID], legibility="CLEAR",
        readable_field_count=4, document_type_certainty=1.0,
    )
    kwargs.update(overrides)
    return compute_confidence(**kwargs)


def test_perfect_read_scores_high():
    assert build().score >= 0.95


def test_score_is_clamped_to_unit_interval():
    assert 0.0 <= build(document_type_certainty=5.0).score <= 1.0


def test_missing_fields_lower_completeness_and_score():
    partial = build(fields_found=2, raw_values=2, normalized_values=2)
    assert partial.fieldCompleteness == 0.5
    assert partial.score < build().score


def test_failed_validators_lower_agreement():
    failing = build(check_statuses=[C.MISMATCH, C.MISMATCH, C.EXPIRED])
    assert failing.validatorAgreement == 0.0
    assert failing.score < build().score


def test_skipped_checks_are_excluded_not_counted_as_failures():
    skipped = build(check_statuses=[C.MATCH, C.SKIPPED, C.VALID])
    assert skipped.validatorAgreement == 1.0


def test_all_checks_skipped_yields_zero_agreement_without_crashing():
    assert build(check_statuses=[C.SKIPPED, C.SKIPPED]).validatorAgreement == 0.0


def test_failed_normalization_lowers_score():
    # Four raw readings, only one survived parsing.
    assert build(normalized_values=1).normalization == 0.25


def test_poor_legibility_lowers_score():
    assert build(legibility="POOR").score < build(legibility="CLEAR").score


def test_degraded_document_is_capped():
    assert build(degraded=True).score <= 0.25


def test_engine_unavailable_scores_zero():
    unavailable = build(engine_available=False)
    assert unavailable.score == 0.0
    assert unavailable.validatorAgreement == 0.0


def test_confidence_labels():
    assert confidence_label(0.95) == "High"
    assert confidence_label(0.70) == "Moderate"
    assert confidence_label(0.40) == "Low"
    assert confidence_label(0.10) == "Very low"
