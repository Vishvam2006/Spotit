from datetime import datetime, date
from typing import Optional
from app.models.schemas import CheckStatus
from app.normalization.date import normalize_date


def validate_validity(valid_until_str: Optional[str], valid_from_str: Optional[str] = None, current_date: Optional[date] = None) -> CheckStatus:
    """
    Determines document validity status strictly via deterministic date logic.
    Groq or AI cannot override this calculation.
    """
    ref_date = current_date or date.today()

    if not valid_until_str:
        return CheckStatus.UNKNOWN

    norm_until = normalize_date(valid_until_str)
    if not norm_until:
        return CheckStatus.INVALID_DATE

    try:
        until_dt = datetime.strptime(norm_until, "%Y-%m-%d").date()
    except ValueError:
        return CheckStatus.INVALID_DATE

    if valid_from_str:
        norm_from = normalize_date(valid_from_str)
        if norm_from:
            try:
                from_dt = datetime.strptime(norm_from, "%Y-%m-%d").date()
                if from_dt > ref_date:
                    return CheckStatus.NOT_YET_VALID
            except ValueError:
                pass

    if until_dt < ref_date:
        return CheckStatus.EXPIRED

    return CheckStatus.VALID
