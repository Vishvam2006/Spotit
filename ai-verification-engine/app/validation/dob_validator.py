from datetime import date
from typing import Optional, Tuple
from app.models.schemas import CheckStatus
from app.normalization.date import normalize_date, is_valid_dob


def validate_dob(doc_dob: str, account_dob: str, ref_date: Optional[date] = None) -> Tuple[CheckStatus, Optional[str]]:
    """
    Validates document DOB against account DOB.
    - DOB match must be EXACT after normalization (YYYY-MM-DD).
    - Reject invalid dates or future dates.
    Returns (CheckStatus, normalized_dob_string).
    """
    if not doc_dob or not account_dob:
        return CheckStatus.MISMATCH, None

    norm_doc = normalize_date(doc_dob)
    norm_acc = normalize_date(account_dob)

    if not norm_doc or not is_valid_dob(norm_doc, current_date=ref_date):
        return CheckStatus.INVALID_DATE, norm_doc

    if not norm_acc:
        return CheckStatus.MISMATCH, norm_doc

    if norm_doc == norm_acc:
        return CheckStatus.MATCH, norm_doc

    return CheckStatus.MISMATCH, norm_doc
