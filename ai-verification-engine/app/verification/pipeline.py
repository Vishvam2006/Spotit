"""
The orchestrator: one uploaded document in, one fully-explained verdict out.

This is the path the README's architecture diagram describes, and now the path
that actually runs:

    image -> vision extraction -> classification -> field mapping ->
    normalization -> deterministic validators -> decision matrix -> confidence

The vision model reads. The rule engine decides. Nothing in here lets a model
opinion become a verdict.
"""

import logging
from dataclasses import dataclass, field as dc_field
from datetime import date, datetime
from typing import List, Optional

from app.classifier.document_classifier import DocumentClassifier
from app.models.schemas import (
    CHECK_OUTCOME_BY_STATUS,
    AccountData,
    CheckOutcome,
    CheckResult,
    CheckStatus,
    ConfidenceBreakdown,
    DocumentType,
    FieldReading,
    VerificationStatus,
    VisionExtraction,
)
from app.normalization.name import compare_names
from app.normalization.vehicle_number import normalize_vehicle_number
from app.validation.dob_validator import validate_dob
from app.validation.name_validator import validate_name
from app.validation.validity_validator import validate_validity
from app.validation.vehicle_validator import validate_vehicle_number
from app.verification.confidence import compute_confidence, confidence_label
from app.verification.decision import evaluate_dl_decision, evaluate_rc_decision
from app.vision.client import VisionClient, detect_mime_type
from app.vision.mapping import (
    map_ancillary_fields,
    map_document_kind,
    map_vision_to_dl,
    map_vision_to_rc,
)

logger = logging.getLogger("VerificationPipeline")

DOCUMENT_TYPE_LABELS = {
    DocumentType.RC: "Vehicle Registration Certificate",
    DocumentType.DRIVING_LICENSE: "Driving Licence",
    DocumentType.UNKNOWN: "Unrecognised document",
}

# The engine's 7 statuses collapse onto the 3 the API has always exposed.
API_STATUS_BY_ENGINE_STATUS = {
    VerificationStatus.VERIFIED: "VERIFIED",
    VerificationStatus.PARTIALLY_MATCHED: "NEEDS_REVIEW",
    VerificationStatus.MISMATCH: "REJECTED",
    VerificationStatus.EXPIRED: "REJECTED",
    VerificationStatus.UNKNOWN_DOCUMENT: "REJECTED",
    VerificationStatus.OCR_FAILED: "NEEDS_REVIEW",
    VerificationStatus.PROCESSING_ERROR: "NEEDS_REVIEW",
}

STATUS_LABELS = {
    VerificationStatus.VERIFIED: "Verified",
    VerificationStatus.PARTIALLY_MATCHED: "Partially matched",
    VerificationStatus.MISMATCH: "Does not match",
    VerificationStatus.EXPIRED: "Expired",
    VerificationStatus.UNKNOWN_DOCUMENT: "Not a recognised document",
    VerificationStatus.OCR_FAILED: "Could not be read",
    VerificationStatus.PROCESSING_ERROR: "Not checked",
}


@dataclass
class DocumentOutcome:
    filename: str
    document_type: DocumentType
    engine_status: VerificationStatus
    api_status: str
    confidence: ConfidenceBreakdown
    checks: List[CheckResult] = dc_field(default_factory=list)
    fields: List[FieldReading] = dc_field(default_factory=list)
    summary: str = ""
    engine_available: bool = True
    model_used: Optional[str] = None
    attempts: int = 0
    latency_ms: int = 0
    failure_reason: Optional[str] = None
    ancillary: dict = dc_field(default_factory=dict)


def _pretty_date(iso: Optional[str]) -> Optional[str]:
    if not iso:
        return None
    try:
        return datetime.strptime(iso, "%Y-%m-%d").date().strftime("%d %b %Y")
    except ValueError:
        return iso


def _days_between(iso: str, ref: date) -> Optional[int]:
    try:
        return (ref - datetime.strptime(iso, "%Y-%m-%d").date()).days
    except ValueError:
        return None


def _as_dict(model) -> dict:
    """pydantic v2 uses model_dump; v1 uses dict."""
    return model.model_dump() if hasattr(model, "model_dump") else model.dict()


def _outcome(status: CheckStatus) -> CheckOutcome:
    return CHECK_OUTCOME_BY_STATUS.get(status, CheckOutcome.UNKNOWN)


def _check(cid: str, label: str, status: CheckStatus, detail: str) -> CheckResult:
    return CheckResult(
        id=cid, label=label, status=_outcome(status), rawStatus=status.value, detail=detail
    )


def _name_detail(status: CheckStatus, doc_name: Optional[str], account_name: str) -> str:
    if not doc_name:
        return "No holder name could be read from the document, so it could not be matched to your account."
    if not account_name:
        return f'Read "{doc_name}", but there is no account name on file to compare it against.'
    _, score = compare_names(doc_name, account_name)
    pct = round(score * 100)
    if status == CheckStatus.MATCH:
        return f'"{doc_name}" matches your account name "{account_name}" ({pct}% similar).'
    return (
        f'Read "{doc_name}" but your account says "{account_name}" -- {pct}% similar, '
        f"below the 90% threshold required for a match."
    )


def _validity_detail(
    status: CheckStatus, valid_until: Optional[str], valid_from: Optional[str], ref: date
) -> str:
    pretty_until = _pretty_date(valid_until)
    if status == CheckStatus.EXPIRED and valid_until:
        days = _days_between(valid_until, ref)
        ago = f", {days:,} days ago" if days and days > 0 else ""
        return f"Expired on {pretty_until}{ago}."
    if status == CheckStatus.VALID:
        return f"Valid until {pretty_until}." if pretty_until else "Within its validity period."
    if status == CheckStatus.NOT_YET_VALID:
        return f"Not valid yet -- it comes into effect on {_pretty_date(valid_from)}."
    if status == CheckStatus.INVALID_DATE:
        return "The validity date on the document could not be read as a real date."
    return "No expiry date was printed or readable, so validity could not be confirmed."


def _document_type_check(
    doc_type: DocumentType, vision_kind: str, classifier_agrees: bool
) -> CheckResult:
    if doc_type == DocumentType.UNKNOWN:
        seen = "a photo that is not a document" if vision_kind == "NOT_A_DOCUMENT" else "a document of another kind"
        return CheckResult(
            id="documentType",
            label="Recognised as a supported document",
            status=CheckOutcome.FAIL,
            rawStatus="UNKNOWN",
            detail=f"This looks like {seen}, not a Vehicle RC or Driving Licence.",
        )
    label = DOCUMENT_TYPE_LABELS[doc_type]
    agreement = (
        "the text classifier agreed" if classifier_agrees else "the text classifier was not certain"
    )
    return CheckResult(
        id="documentType",
        label="Recognised as a supported document",
        status=CheckOutcome.PASS,
        rawStatus="MATCH",
        detail=f"Identified as a {label}; {agreement}.",
    )


def _unavailable_outcome(filename: str, reason: str) -> DocumentOutcome:
    """
    The engine never saw the document. That is not the same as deciding the
    document is bad, so it must never render as a rejection.
    """
    skipped = [
        _check(cid, label, CheckStatus.SKIPPED, "Not checked -- the verification engine was unavailable.")
        for cid, label in (
            ("documentType", "Recognised as a supported document"),
            ("nameMatch", "Owner name matches your account"),
            ("registrationMatch", "Registration number matches your vehicle"),
            ("validity", "Document is currently valid"),
        )
    ]
    return DocumentOutcome(
        filename=filename,
        document_type=DocumentType.UNKNOWN,
        engine_status=VerificationStatus.PROCESSING_ERROR,
        api_status="NEEDS_REVIEW",
        confidence=ConfidenceBreakdown(),
        checks=skipped,
        fields=[],
        summary=reason,
        engine_available=False,
        failure_reason=reason,
    )


def verify_document_image(
    content: bytes,
    filename: str,
    account: AccountData,
    vision: VisionClient,
    current_date: Optional[date] = None,
    extraction: Optional[VisionExtraction] = None,
    classifier: Optional[DocumentClassifier] = None,
) -> DocumentOutcome:
    ref_date = current_date or date.today()
    mime = detect_mime_type(content)
    # Injectable so callers can share one instance across a batch, and so tests
    # can supply a classifier with no Groq client rather than hitting the network.
    classifier = classifier or DocumentClassifier()

    # 1. Read the document (the OCR step).
    if extraction is None:
        extraction = vision.extract(content, mime)

    if not extraction.ok:
        return _unavailable_outcome(
            filename, extraction.failure_reason or "The verification engine was unavailable."
        )

    # 2. Independent second opinion on the document type from the keyword/text
    #    classifier, running on the transcription.
    classifier_type, classifier_conf = classifier.classify(extraction.transcription)
    doc_type = map_document_kind(extraction.document_kind)
    if doc_type == DocumentType.UNKNOWN and classifier_conf >= 0.80:
        doc_type = classifier_type
    classifier_agrees = classifier_type == doc_type and doc_type != DocumentType.UNKNOWN

    if classifier_agrees:
        type_certainty = 1.0
    elif doc_type != DocumentType.UNKNOWN:
        type_certainty = 0.70
    else:
        type_certainty = 0.0

    ancillary = map_ancillary_fields(extraction.fields)

    if doc_type == DocumentType.UNKNOWN:
        checks = [_document_type_check(doc_type, extraction.document_kind, False)]
        confidence = compute_confidence(
            fields_found=0,
            fields_required=4,
            raw_values=0,
            normalized_values=0,
            check_statuses=[],
            legibility=extraction.legibility,
            readable_field_count=extraction.readable_field_count,
            document_type_certainty=0.0,
            degraded=True,
        )
        return DocumentOutcome(
            filename=filename,
            document_type=DocumentType.UNKNOWN,
            engine_status=VerificationStatus.UNKNOWN_DOCUMENT,
            api_status="REJECTED",
            confidence=confidence,
            checks=checks,
            fields=[],
            summary="This image is not a Vehicle Registration Certificate or a Driving Licence.",
            model_used=extraction.model_used,
            attempts=extraction.attempts,
            latency_ms=extraction.latency_ms,
            ancillary=ancillary,
        )

    if doc_type == DocumentType.RC:
        return _verify_rc(
            filename, extraction, account, ref_date, type_certainty, classifier_agrees, ancillary
        )
    return _verify_dl(
        filename, extraction, account, ref_date, type_certainty, classifier_agrees, ancillary
    )


def _verify_rc(
    filename, extraction, account, ref_date, type_certainty, classifier_agrees, ancillary
) -> DocumentOutcome:
    fields, raw = map_vision_to_rc(extraction.fields)

    name_status, _ = validate_name(fields.name or "", account.name or "")

    # No vehicle selected means there is nothing to compare against. Skipping is
    # honest; failing would punish the user for a choice they did not make.
    expected_reg = (account.vehicle_registration_number or "").strip()
    if not expected_reg:
        veh_status = CheckStatus.SKIPPED
    else:
        veh_status, _ = validate_vehicle_number(
            fields.vehicle_registration_number or "", expected_reg
        )

    validity_status = validate_validity(fields.valid_until, fields.valid_from, current_date=ref_date)

    result = evaluate_rc_decision(name_status, veh_status, validity_status, confidence=1.0)

    if veh_status == CheckStatus.SKIPPED:
        reg_detail = "No vehicle was selected, so there was nothing to match the registration against."
    elif not fields.vehicle_registration_number:
        reg_detail = "No registration number could be read from the document."
    elif veh_status == CheckStatus.MATCH:
        reg_detail = f"{fields.vehicle_registration_number} matches your garage record {normalize_vehicle_number(expected_reg)}."
    else:
        reg_detail = (
            f"The document reads {fields.vehicle_registration_number}, but your selected vehicle is "
            f"{normalize_vehicle_number(expected_reg)}."
        )

    checks = [
        _document_type_check(DocumentType.RC, extraction.document_kind, classifier_agrees),
        _check("nameMatch", "Owner name matches your account", name_status,
               _name_detail(name_status, fields.name, account.name or "")),
        _check("registrationMatch", "Registration number matches your vehicle", veh_status, reg_detail),
        _check("validity", "Document is currently valid", validity_status,
               _validity_detail(validity_status, fields.valid_until, fields.valid_from, ref_date)),
    ]

    readings = [
        FieldReading(id="vehicleNumber", label="Registration Number",
                     value=fields.vehicle_registration_number,
                     rawValue=raw["vehicle_registration_number"],
                     expected=normalize_vehicle_number(expected_reg) if expected_reg else None,
                     state=_outcome(veh_status)),
        FieldReading(id="ownerName", label="Owner Name", value=fields.name,
                     rawValue=raw["name"], expected=account.name or None,
                     state=_outcome(name_status)),
        FieldReading(id="issueDate", label="Registered On", value=fields.valid_from,
                     rawValue=raw["valid_from"], state=CheckOutcome.UNKNOWN),
        FieldReading(id="expiryDate", label="Valid Until", value=fields.valid_until,
                     rawValue=raw["valid_until"], state=_outcome(validity_status)),
    ]

    return _finalize(filename, DocumentType.RC, result, checks, readings, fields, raw,
                     extraction, type_certainty, ancillary)


def _verify_dl(
    filename, extraction, account, ref_date, type_certainty, classifier_agrees, ancillary
) -> DocumentOutcome:
    fields, raw = map_vision_to_dl(extraction.fields)

    name_status, _ = validate_name(fields.name or "", account.name or "")

    # The User model has no date-of-birth column, so there is usually nothing to
    # compare against. Skipping keeps a valid licence from being rejected outright.
    expected_dob = (account.date_of_birth or "").strip()
    if not expected_dob:
        dob_status = CheckStatus.SKIPPED
        dob_detail = "No date of birth is on file for your account, so this was not checked."
    else:
        dob_status, _ = validate_dob(fields.date_of_birth or "", expected_dob, ref_date=ref_date)
        if dob_status == CheckStatus.MATCH:
            dob_detail = f"Date of birth {_pretty_date(fields.date_of_birth)} matches your account."
        elif not fields.date_of_birth:
            dob_detail = "No date of birth could be read from the licence."
        else:
            dob_detail = (
                f"The licence reads {_pretty_date(fields.date_of_birth)}, but your account says "
                f"{_pretty_date(expected_dob)}."
            )

    validity_status = validate_validity(fields.valid_until, fields.valid_from, current_date=ref_date)
    result = evaluate_dl_decision(name_status, dob_status, validity_status, confidence=1.0)

    checks = [
        _document_type_check(DocumentType.DRIVING_LICENSE, extraction.document_kind, classifier_agrees),
        _check("nameMatch", "Licence holder matches your account", name_status,
               _name_detail(name_status, fields.name, account.name or "")),
        _check("dobMatch", "Date of birth matches your account", dob_status, dob_detail),
        _check("validity", "Licence is currently valid", validity_status,
               _validity_detail(validity_status, fields.valid_until, fields.valid_from, ref_date)),
    ]

    readings = [
        FieldReading(id="ownerName", label="Licence Holder", value=fields.name,
                     rawValue=raw["name"], expected=account.name or None,
                     state=_outcome(name_status)),
        FieldReading(id="dateOfBirth", label="Date of Birth", value=fields.date_of_birth,
                     rawValue=raw["date_of_birth"], expected=expected_dob or None,
                     state=_outcome(dob_status)),
        FieldReading(id="issueDate", label="Valid From", value=fields.valid_from,
                     rawValue=raw["valid_from"], state=CheckOutcome.UNKNOWN),
        FieldReading(id="expiryDate", label="Valid Until", value=fields.valid_until,
                     rawValue=raw["valid_until"], state=_outcome(validity_status)),
    ]

    return _finalize(filename, DocumentType.DRIVING_LICENSE, result, checks, readings, fields, raw,
                     extraction, type_certainty, ancillary)


def _finalize(filename, doc_type, result, checks, readings, fields, raw, extraction,
              type_certainty, ancillary) -> DocumentOutcome:
    # raw holds what the model read; fields holds what survived normalization.
    # Comparing the two counts is what makes `normalization` a real signal.
    fields_required = len(raw)
    fields_found = sum(1 for v in raw.values() if v)
    normalized_values = sum(1 for v in _as_dict(fields).values() if v)

    # Every check's rawStatus is a CheckStatus value, so this round-trips cleanly.
    statuses = [CheckStatus(c.rawStatus) for c in checks]

    confidence = compute_confidence(
        fields_found=fields_found,
        fields_required=fields_required,
        raw_values=fields_found,
        normalized_values=normalized_values,
        check_statuses=statuses,
        legibility=extraction.legibility,
        readable_field_count=extraction.readable_field_count,
        document_type_certainty=type_certainty,
    )

    return DocumentOutcome(
        filename=filename,
        document_type=doc_type,
        engine_status=result.status,
        api_status=API_STATUS_BY_ENGINE_STATUS.get(result.status, "NEEDS_REVIEW"),
        confidence=confidence,
        checks=checks,
        fields=readings,
        summary=result.message or "",
        model_used=extraction.model_used,
        attempts=extraction.attempts,
        latency_ms=extraction.latency_ms,
        ancillary=ancillary,
    )
