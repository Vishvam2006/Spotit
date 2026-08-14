from typing import Tuple
from app.models.schemas import CheckStatus
from app.normalization.name import compare_names


def validate_name(doc_name: str, account_name: str, threshold: float = 0.90) -> Tuple[CheckStatus, float]:
    """
    Validates extracted document name against application account name.
    Uses normalized controlled fuzzy matching.
    Returns (CheckStatus, similarity_score).
    """
    if not doc_name or not account_name:
        return CheckStatus.MISMATCH, 0.0

    is_match, score = compare_names(doc_name, account_name, threshold=threshold)
    status = CheckStatus.MATCH if is_match else CheckStatus.MISMATCH
    return status, score
