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
    # No DOB on the account to compare against (the User model has no DOB column),
    # so the DOB check is skipped rather than failed. Without this, validate_dob
    # returns MISMATCH for an empty account DOB and every valid licence would be
    # rejected by the MISMATCH branch below.
    if dob_status == CheckStatus.SKIPPED:
        if name_status == CheckStatus.MATCH:
            return VerificationResult(
                status=VerificationStatus.VERIFIED,
                document_type=DocumentType.DRIVING_LICENSE,
                confidence=confidence,
                checks=checks,
                message="Driving Licence verified against the account name. Date of birth was not checked because none is on file."
            )
        return VerificationResult(
            status=VerificationStatus.MISMATCH,
            document_type=DocumentType.DRIVING_LICENSE,
            confidence=confidence,
            checks=checks,
            message="The name on the Driving Licence does not match the account name."
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

    # Standalone scan with no vehicle selected: there is no registration to compare
    # against, so the check is skipped rather than failed.
    if vehicle_status == CheckStatus.SKIPPED:
        if name_status == CheckStatus.MATCH:
            return VerificationResult(
                status=VerificationStatus.VERIFIED,
                document_type=DocumentType.RC,
                confidence=confidence,
                checks=checks,
                message="RC verified against the account name. No vehicle was selected, so the registration number was not cross-checked."
            )
        return VerificationResult(
            status=VerificationStatus.MISMATCH,
            document_type=DocumentType.RC,
            confidence=confidence,
            checks=checks,
            message="The owner name on the RC does not match the account name."
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
