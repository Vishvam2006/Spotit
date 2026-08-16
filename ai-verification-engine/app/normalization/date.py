import re
from datetime import datetime, date
from typing import Optional


MONTH_MAP = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
    "JANUARY": 1, "FEBRUARY": 2, "MARCH": 3, "APRIL": 4, "JUNE": 6,
    "JULY": 7, "AUGUST": 8, "SEPTEMBER": 9, "OCTOBER": 10, "NOVEMBER": 11, "DECEMBER": 12
}


def normalize_date(date_str: str) -> Optional[str]:
    if not date_str or not isinstance(date_str, str):
        return None

    clean_str = date_str.strip().upper()
    clean_str = re.sub(r"\s+", " ", clean_str)

    #check for YYYY-MM-DD
    m_iso = re.match(r"^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$", clean_str)
    if m_iso:
        y, m, d = int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3))
        try:
            dt = date(y, m, d)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            return None

    #check for DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    m_dmy = re.match(r"^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$", clean_str)
    if m_dmy:
        d, m, y = int(m_dmy.group(1)), int(m_dmy.group(2)), int(m_dmy.group(3))
        try:
            dt = date(y, m, d)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            return None

    #check for DD MMM YYYY (e.g. 12 APR 2005)
    m_text = re.match(r"^(\d{1,2})[-/. ]([A-Z]{3,9})[-/. ](\d{4})$", clean_str)
    if m_text:
        d = int(m_text.group(1))
        m_str = m_text.group(2)
        y = int(m_text.group(3))
        if m_str in MONTH_MAP:
            m = MONTH_MAP[m_str]
            try:
                dt = date(y, m, d)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                return None

    return None


def is_valid_dob(dob_str: str, current_date: Optional[date] = None) -> bool:
    norm_dob = normalize_date(dob_str)
    if not norm_dob:
        return False

    try:
        dt = datetime.strptime(norm_dob, "%Y-%m-%d").date()
    except ValueError:
        return False

    ref_date = current_date or date.today()

    if dt > ref_date:
        return False

    if dt.year < 1900:
        return False

    return True
