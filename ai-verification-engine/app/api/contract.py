"""
Serializes pipeline outcomes onto the wire format the Node backend and frontend
already expect.

Every legacy key keeps its name and type, so `frontend/src/services/verification.ts`
continues to compile untouched. Everything new is additive and optional, which is
what lets the UI migrate one component at a time.
"""

import os
from typing import Dict, List, Optional

from app.models.schemas import DocumentType, VerificationStatus
from app.verification.confidence import confidence_label
from app.verification.pipeline import DOCUMENT_TYPE_LABELS, STATUS_LABELS, DocumentOutcome

ENGINE_VERSION = "2.0"

# The legacy wire vocabulary for documentType, kept for backward compatibility.
LEGACY_DOCUMENT_TYPE = {
    DocumentType.RC: "VEHICLE_RC",
    DocumentType.DRIVING_LICENSE: "DRIVING_LICENSE",
    DocumentType.UNKNOWN: "UNKNOWN",
}


def _field_value(outcome: DocumentOutcome, field_id: str) -> Optional[str]:
    for reading in outcome.fields:
        if reading.id == field_id:
            return reading.value
    return None


def _legacy_checks(outcome: DocumentOutcome) -> Dict[str, bool]:
    """
    The original four booleans, now derived from checks that actually ran.
    A SKIPPED or UNKNOWN check is not a pass -- but it is also not a failure, so
    it maps to True only where the legacy contract treated absence as benign.
    """
    by_id = {c.id: c for c in outcome.checks}

    def passed(cid: str, absent_default: bool = False) -> bool:
        check = by_id.get(cid)
        if check is None:
            return absent_default
        if check.status.value == "PASS":
            return True
        if check.status.value in ("SKIPPED", "UNKNOWN"):
            return absent_default
        return False

    return {
        "formatValid": outcome.document_type != DocumentType.UNKNOWN,
        # A skipped registration check (no vehicle selected) is not a mismatch.
        "registrationMatch": passed("registrationMatch", absent_default=True),
        "nameMatch": passed("nameMatch", absent_default=False),
        # This is the one that used to be hardcoded True regardless of the date.
        "expiryCheck": passed("validity", absent_default=False),
    }


def to_api_document(outcome: DocumentOutcome) -> dict:
    return {
        # ---- legacy keys, unchanged shape ----
        "filename": outcome.filename,
        "documentType": LEGACY_DOCUMENT_TYPE.get(outcome.document_type, "UNKNOWN"),
        "status": outcome.api_status,
        "confidenceScore": outcome.confidence.score,
        "extractedFields": {
            "documentType": LEGACY_DOCUMENT_TYPE.get(outcome.document_type, "UNKNOWN"),
            "documentNumber": outcome.ancillary.get("document_number"),
            "ownerName": _field_value(outcome, "ownerName"),
            "vehicleNumber": _field_value(outcome, "vehicleNumber"),
            "vehicleClass": outcome.ancillary.get("vehicle_class"),
            "issueDate": _field_value(outcome, "issueDate"),
            "expiryDate": _field_value(outcome, "expiryDate"),
            "issuingAuthority": outcome.ancillary.get("issuing_authority"),
        },
        "checks": _legacy_checks(outcome),
        "summary": outcome.summary,
        # ---- new, additive ----
        "documentTypeLabel": DOCUMENT_TYPE_LABELS.get(outcome.document_type, "Unrecognised document"),
        "statusLabel": STATUS_LABELS.get(outcome.engine_status, "Not checked"),
        "engineStatus": outcome.engine_status.value,
        "engineAvailable": outcome.engine_available,
        "confidenceLabel": confidence_label(outcome.confidence.score),
        "confidenceBreakdown": {
            "fieldCompleteness": outcome.confidence.fieldCompleteness,
            "normalization": outcome.confidence.normalization,
            "validatorAgreement": outcome.confidence.validatorAgreement,
            "legibility": outcome.confidence.legibility,
            "documentTypeCertainty": outcome.confidence.documentTypeCertainty,
        },
        "checkResults": [c.model_dump() if hasattr(c, "model_dump") else c.dict() for c in outcome.checks],
        "fields": [f.model_dump() if hasattr(f, "model_dump") else f.dict() for f in outcome.fields],
        "diagnostics": {
            "modelUsed": outcome.model_used,
            "attempts": outcome.attempts,
            "latencyMs": outcome.latency_ms,
            "failureReason": outcome.failure_reason,
        },
    }


def _overall_summary(outcomes: List[DocumentOutcome], overall_status: str) -> str:
    """
    Speak with the governing document's own voice. The old code emitted a fixed
    "not a valid RC Book or registration does not match" for every rejection,
    which was simply wrong whenever the cause was an expired or mismatched name.
    """
    if not outcomes:
        return "No documents were processed."

    unavailable = [o for o in outcomes if not o.engine_available]
    if unavailable and len(unavailable) == len(outcomes):
        return unavailable[0].summary

    if overall_status == "REJECTED":
        governing = next((o for o in outcomes if o.api_status == "REJECTED"), outcomes[0])
        return governing.summary
    if overall_status == "NEEDS_REVIEW":
        governing = next((o for o in outcomes if o.api_status == "NEEDS_REVIEW"), outcomes[0])
        return governing.summary

    count = len(outcomes)
    noun = "document" if count == 1 else "documents"
    return f"All {count} {noun} verified successfully against your records."


def to_api_response(outcomes: List[DocumentOutcome]) -> dict:
    if any(o.api_status == "REJECTED" for o in outcomes):
        overall_status = "REJECTED"
    elif any(o.api_status == "NEEDS_REVIEW" for o in outcomes):
        overall_status = "NEEDS_REVIEW"
    else:
        overall_status = "VERIFIED"

    # Averaging a 0.0 outage into a real 0.9 read produces a meaningless 0.45, so
    # documents the engine never saw are excluded from the headline number.
    scored = [o.confidence.score for o in outcomes if o.engine_available]
    overall_confidence = round(sum(scored) / len(scored), 2) if scored else 0.0

    return {
        "success": True,
        "verificationId": f"ver_{os.urandom(4).hex()}",
        "engineVersion": ENGINE_VERSION,
        "engineAvailable": any(o.engine_available for o in outcomes),
        "overallStatus": overall_status,
        "overallConfidence": overall_confidence,
        "documents": [to_api_document(o) for o in outcomes],
        "summary": _overall_summary(outcomes, overall_status),
    }
