"""
Maps the vision model's raw JSON onto the field models the validators already use.

No new normalization logic lives here. correct_ocr_vehicle_number and
normalize_date are the same functions app/extraction/field_extractor.py applies
to text-model output -- the vision model is simply a different source of the same
raw strings.
"""

from typing import Dict, Optional, Tuple

from app.models.schemas import DocumentType, DrivingLicenseFields, RCFields
from app.normalization.date import normalize_date
from app.normalization.vehicle_number import correct_ocr_vehicle_number
from app.vision.sanitize import sanitize_field

RawFields = Dict[str, Optional[str]]


def map_document_kind(kind: str) -> DocumentType:
    return {
        "VEHICLE_RC": DocumentType.RC,
        "DRIVING_LICENSE": DocumentType.DRIVING_LICENSE,
    }.get((kind or "").upper().strip(), DocumentType.UNKNOWN)


def map_vision_to_rc(fields: dict) -> Tuple[RCFields, RawFields]:
    """
    Returns (RCFields, raw_by_field). The raw strings are kept so the UI can show
    'read as GJ O1 AB I234 -> normalized GJ01AB1234', which is the clearest
    demonstration that the OCR-correction layer is doing something.
    """
    raw_name = sanitize_field(fields, "holder_name")
    raw_reg = sanitize_field(fields, "registration_number")
    raw_from = sanitize_field(fields, "valid_from")
    raw_until = sanitize_field(fields, "valid_until")

    mapped = RCFields(
        name=raw_name,
        vehicle_registration_number=correct_ocr_vehicle_number(raw_reg) if raw_reg else None,
        valid_from=normalize_date(raw_from) if raw_from else None,
        valid_until=normalize_date(raw_until) if raw_until else None,
    )
    raw = {
        "name": raw_name,
        "vehicle_registration_number": raw_reg,
        "valid_from": raw_from,
        "valid_until": raw_until,
    }
    return mapped, raw


def map_vision_to_dl(fields: dict) -> Tuple[DrivingLicenseFields, RawFields]:
    raw_name = sanitize_field(fields, "holder_name")
    raw_dob = sanitize_field(fields, "date_of_birth")
    raw_from = sanitize_field(fields, "valid_from")
    raw_until = sanitize_field(fields, "valid_until")

    mapped = DrivingLicenseFields(
        name=raw_name,
        date_of_birth=normalize_date(raw_dob) if raw_dob else None,
        valid_from=normalize_date(raw_from) if raw_from else None,
        valid_until=normalize_date(raw_until) if raw_until else None,
    )
    raw = {
        "name": raw_name,
        "date_of_birth": raw_dob,
        "valid_from": raw_from,
        "valid_until": raw_until,
    }
    return mapped, raw


def map_ancillary_fields(fields: dict) -> RawFields:
    """Fields shown to the user but never used in a verification decision."""
    return {
        "document_number": sanitize_field(fields, "document_number"),
        "vehicle_class": sanitize_field(fields, "vehicle_class"),
        "issuing_authority": sanitize_field(fields, "issuing_authority"),
    }
