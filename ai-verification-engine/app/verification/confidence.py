"""
Derives a confidence score from real signals.

The previous engine asked the vision model to self-report a confidence between
0.70 and 1.00 for any document it considered valid, then used ">= 0.70" as the
threshold for a VERIFIED verdict -- a test that could not fail. This computes the
number instead, from things that are actually observable:

  field completeness      how many required fields came back at all
  normalization           how many raw readings survived date/registration parsing
  validator agreement     how the deterministic checks actually landed
  legibility              the model's own read-quality report (a thing it CAN see)
  document type certainty whether the vision kind and the text classifier agree

Confidence never influences status. Status comes only from the decision matrix.
The score describes how well we read the document, not whether we believe it.
"""

from typing import List, Optional

from app.models.schemas import CheckStatus, ConfidenceBreakdown

WEIGHTS = {
    "fieldCompleteness": 0.30,
    "validatorAgreement": 0.30,
    "documentTypeCertainty": 0.15,
    "normalization": 0.15,
    "legibility": 0.10,
}

LEGIBILITY_SCORES = {"CLEAR": 1.0, "PARTIAL": 0.6, "POOR": 0.25}

# Statuses that represent a check we actually ran and that came out clean.
_PASSING = {CheckStatus.MATCH, CheckStatus.VALID}
# Statuses that mean "we could not run this", excluded from agreement entirely.
_NOT_RUN = {CheckStatus.SKIPPED, CheckStatus.UNKNOWN}


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return _clamp(numerator / denominator)


def compute_confidence(
    *,
    fields_found: int,
    fields_required: int,
    raw_values: int,
    normalized_values: int,
    check_statuses: List[CheckStatus],
    legibility: str,
    readable_field_count: int,
    document_type_certainty: float,
    engine_available: bool = True,
    degraded: bool = False,
) -> ConfidenceBreakdown:
    if not engine_available:
        # We never saw the document. Any positive number here would be a lie.
        return ConfidenceBreakdown()

    field_completeness = _ratio(fields_found, fields_required)
    normalization = _ratio(normalized_values, raw_values) if raw_values else 0.0

    executed = [s for s in check_statuses if s not in _NOT_RUN]
    validator_agreement = (
        _ratio(sum(1 for s in executed if s in _PASSING), len(executed)) if executed else 0.0
    )

    # Blend what the model said about legibility with how many fields it actually
    # claimed to read cleanly, so a "CLEAR" claim on a 1-of-6 read is discounted.
    reported = LEGIBILITY_SCORES.get((legibility or "").upper().strip(), 0.4)
    legibility_score = _clamp(
        0.6 * reported + 0.4 * _ratio(readable_field_count, max(fields_required, 1))
    )

    breakdown = ConfidenceBreakdown(
        fieldCompleteness=round(field_completeness, 2),
        normalization=round(normalization, 2),
        validatorAgreement=round(validator_agreement, 2),
        legibility=round(legibility_score, 2),
        documentTypeCertainty=round(_clamp(document_type_certainty), 2),
    )

    score = (
        WEIGHTS["fieldCompleteness"] * breakdown.fieldCompleteness
        + WEIGHTS["validatorAgreement"] * breakdown.validatorAgreement
        + WEIGHTS["documentTypeCertainty"] * breakdown.documentTypeCertainty
        + WEIGHTS["normalization"] * breakdown.normalization
        + WEIGHTS["legibility"] * breakdown.legibility
    )

    if degraded:
        # Unrecognised or unreadable document: cap it regardless of the components.
        score = min(score, 0.25)

    breakdown.score = round(_clamp(score), 2)
    return breakdown


def confidence_label(score: float) -> str:
    if score >= 0.85:
        return "High"
    if score >= 0.60:
        return "Moderate"
    if score >= 0.35:
        return "Low"
    return "Very low"
