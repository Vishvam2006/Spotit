import re
from typing import Tuple


LETTER_TO_DIGIT = {
    "O": "0",
    "I": "1",
    "L": "1",
    "Z": "2",
    "S": "5",
    "B": "8",
    "G": "6",
    "Q": "0",
}

DIGIT_TO_LETTER = {
    "0": "O",
    "1": "I",
    "2": "Z",
    "5": "S",
    "8": "B",
    "6": "G",
}


def normalize_vehicle_number(raw_str: str) -> str:
    if not raw_str:
        return ""

    clean = raw_str.upper().strip()
    clean = re.sub(r"[^A-Z0-9]", "", clean)
    return clean


def correct_ocr_vehicle_number(raw_str: str) -> str:
    norm = normalize_vehicle_number(raw_str)
    if not norm or len(norm) < 7 or len(norm) > 11:
        return norm
    m = re.match(r"^([A-Z0-9]{2})([A-Z0-9]{1,2})([A-Z0-9]{1,3})?([A-Z0-9]{4})$", norm)
    if not m:
        return norm

    state_part = m.group(1)
    rto_part = m.group(2)
    series_part = m.group(3) or ""
    num_part = m.group(4)

    # 1. State Part: should be 2 letters
    corr_state = "".join(DIGIT_TO_LETTER.get(ch, ch) for ch in state_part)

    # 2. RTO Part: should be 1-2 digits
    corr_rto = "".join(LETTER_TO_DIGIT.get(ch, ch) for ch in rto_part)

    # 3. Series Part: should be 1-3 letters (if present)
    corr_series = "".join(DIGIT_TO_LETTER.get(ch, ch) for ch in series_part)

    # 4. Number Part: should be 4 digits
    corr_num = "".join(LETTER_TO_DIGIT.get(ch, ch) for ch in num_part)

    corrected = f"{corr_state}{corr_rto}{corr_series}{corr_num}"
    return corrected


def compare_vehicle_numbers(veh1: str, veh2: str) -> Tuple[bool, str, str]:

    norm1 = normalize_vehicle_number(veh1)
    norm2 = normalize_vehicle_number(veh2)

    if not norm1 or not norm2:
        return False, norm1, norm2

    if norm1 == norm2:
        return True, norm1, norm2

    corr1 = correct_ocr_vehicle_number(veh1)
    corr2 = correct_ocr_vehicle_number(veh2)

    if corr1 == corr2 or corr1 == norm2 or norm1 == corr2:
        return True, corr1, corr2

    return False, corr1, corr2
