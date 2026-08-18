"""
Sanitization for model-returned strings.

Two jobs: keep control characters and runaway lengths out of the database and the
UI, and refuse values that look like prompt injection rather than document text.
An RC owner is not literally named "ignore previous instructions".
"""

import re
from typing import Optional

MAX_LENS = {
    "holder_name": 64,
    "registration_number": 16,
    "document_number": 32,
    "vehicle_class": 32,
    "issuing_authority": 64,
    "date_of_birth": 24,
    "valid_from": 24,
    "valid_until": 24,
}

MAX_TRANSCRIPTION_CHARS = 4000

INJECTION_PATTERNS = re.compile(
    r"(ignore\s+(all\s+)?previous"
    r"|disregard\s+(the\s+)?(above|previous)"
    r"|you\s+must\s+(return|output|say)"
    r"|system\s+prompt"
    r"|^\s*assistant\s*:"
    r"|^\s*VERIFIED\s*$)",
    re.IGNORECASE,
)

# C0 and C1 control characters, excluding tab/newline which we handle explicitly.
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]")


def sanitize_text_field(value: Optional[str], max_len: int) -> Optional[str]:
    """
    Clean a single extracted field. Returns None for anything empty after
    cleaning, or anything that reads as an injection attempt rather than a value.
    """
    if value is None or not isinstance(value, str):
        return None

    cleaned = _CONTROL_CHARS.sub("", value)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if not cleaned:
        return None
    if cleaned.lower() in {"null", "none", "n/a", "na", "-"}:
        return None
    if INJECTION_PATTERNS.search(cleaned):
        return None

    return cleaned[:max_len]


def sanitize_field(raw: dict, key: str) -> Optional[str]:
    """Sanitize `raw[key]` using the configured maximum length for that field."""
    return sanitize_text_field(raw.get(key), MAX_LENS.get(key, 64))


def sanitize_transcription(value: Optional[str]) -> str:
    """
    Clean the full transcription. Newlines are preserved -- the keyword classifier
    reads this line by line -- but control characters and length are bounded.

    This never leaves the engine: it feeds DocumentClassifier and is then dropped,
    which is what keeps the zero-retention property and closes the injection
    surface at the presentation layer.
    """
    if not value or not isinstance(value, str):
        return ""

    cleaned = _CONTROL_CHARS.sub("", value)
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()[:MAX_TRANSCRIPTION_CHARS]
