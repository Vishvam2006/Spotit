import re
import os
from typing import Tuple

try:
    from rapidfuzz import fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    import difflib
    HAS_RAPIDFUZZ = False

DEFAULT_THRESHOLD = float(os.getenv("NAME_MATCH_THRESHOLD", "0.90"))


def normalize_name(name: str) -> str:

    if not name:
        return ""

    name_clean = name.upper().strip()
    name_clean = re.sub(r"[^\w\s]", " ", name_clean)
    name_clean = re.sub(r"\s+", " ", name_clean).strip()
    return name_clean


def compare_names(name1: str, name2: str, threshold: float = DEFAULT_THRESHOLD) -> Tuple[bool, float]:
    norm1 = normalize_name(name1)
    norm2 = normalize_name(name2)

    if not norm1 or not norm2:
        return False, 0.0

    if norm1 == norm2:
        return True, 1.0

    if HAS_RAPIDFUZZ:
        score = fuzz.ratio(norm1, norm2) / 100.0
    else:
        score = difflib.SequenceMatcher(None, norm1, norm2).ratio()
    is_match = score >= threshold
    return is_match, round(score, 4)
