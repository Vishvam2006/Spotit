from typing import Tuple
from app.models.schemas import CheckStatus
from app.normalization.vehicle_number import compare_vehicle_numbers


def validate_vehicle_number(doc_veh: str, account_veh: str) -> Tuple[CheckStatus, str]:
    """
    Validates document vehicle registration number against account vehicle registration number.
    Applies normalization and context-aware OCR correction.
    Returns (CheckStatus, normalized_doc_veh).
    """
    if not doc_veh or not account_veh:
        return CheckStatus.MISMATCH, ""

    is_match, norm_doc, norm_acc = compare_vehicle_numbers(doc_veh, account_veh)
    status = CheckStatus.MATCH if is_match else CheckStatus.MISMATCH
    return status, norm_doc
