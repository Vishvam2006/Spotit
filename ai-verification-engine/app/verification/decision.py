from typing import Dict
from app.models.schemas import (
    DocumentType,
    VerificationStatus,
    CheckStatus,
    VerificationResult,
)


def evaluate_dl_decision(
    name_status: CheckStatus,
    dob_status: CheckStatus,
    validity_status: CheckStatus,
    confidence: float = 1.0
) -> VerificationResult:
    checks: Dict[str, str] = {
        "name": name_status.value,
        "date_of_birth": dob_status.value,
        "validity": validity_status.value,
    }

    if validity_status == CheckStatus.EXPIRED:
        return VerificationResult(
            status=VerificationStatus.EXPIRED,
            document_type=DocumentType.DRIVING_LICENSE,
            confidence=confidence,
            checks=checks,
            message="Driving Licence is expired."
        )
    if name_status == CheckStatus.MATCH and dob_status == CheckStatus.MATCH:
        return VerificationResult(
            status=VerificationStatus.VERIFIED,
            document_type=DocumentType.DRIVING_LICENSE,
            confidence=confidence,
            checks=checks,
            message="Driving Licence verified successfully."
        )

    if name_status == CheckStatus.MISMATCH or dob_status == CheckStatus.MISMATCH:
        return VerificationResult(
            status=VerificationStatus.MISMATCH,
            document_type=DocumentType.DRIVING_LICENSE,
            confidence=confidence,
            checks=checks,
            message="Driving Licence information does not match application account."
        )

    if name_status == CheckStatus.MATCH or dob_status == CheckStatus.MATCH:
        return VerificationResult(
            status=VerificationStatus.PARTIALLY_MATCHED,
            document_type=DocumentType.DRIVING_LICENSE,
            confidence=confidence,
            checks=checks,
            message="Driving Licence partially matched account data."
        )

    return VerificationResult(
        status=VerificationStatus.MISMATCH,
        document_type=DocumentType.DRIVING_LICENSE,
        confidence=confidence,
        checks=checks,
        message="Verification checks failed."
    )


def evaluate_rc_decision(
    name_status: CheckStatus,
    vehicle_status: CheckStatus,
    validity_status: CheckStatus,
    confidence: float = 1.0
) -> VerificationResult:
    checks: Dict[str, str] = {
        "name": name_status.value,
        "vehicle_registration_number": vehicle_status.value,
        "validity": validity_status.value,
    }

    if validity_status == CheckStatus.EXPIRED:
        return VerificationResult(
            status=VerificationStatus.EXPIRED,
            document_type=DocumentType.RC,
            confidence=confidence,
            checks=checks,
            message="Vehicle Registration Certificate (RC) is expired."
        )

    if name_status == CheckStatus.MATCH and vehicle_status == CheckStatus.MATCH:
        return VerificationResult(
            status=VerificationStatus.VERIFIED,
            document_type=DocumentType.RC,
            confidence=confidence,
            checks=checks,
            message="Vehicle Registration Certificate (RC) verified successfully."
        )
    if name_status == CheckStatus.MISMATCH or vehicle_status == CheckStatus.MISMATCH:
        return VerificationResult(
            status=VerificationStatus.MISMATCH,
            document_type=DocumentType.RC,
            confidence=confidence,
            checks=checks,
            message="Vehicle RC details do not match application account."
        )

    if name_status == CheckStatus.MATCH or vehicle_status == CheckStatus.MATCH:
        return VerificationResult(
            status=VerificationStatus.PARTIALLY_MATCHED,
            document_type=DocumentType.RC,
            confidence=confidence,
            checks=checks,
            message="Vehicle RC details partially matched account data."
        )

    return VerificationResult(
        status=VerificationStatus.MISMATCH,
        document_type=DocumentType.RC,
        confidence=confidence,
        checks=checks,
        message="Verification checks failed."
    )
