from enum import Enum
from typing import Dict, Optional, Any
from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    DRIVING_LICENSE = "DRIVING_LICENSE"
    RC = "RC"
    UNKNOWN = "UNKNOWN"


class VerificationStatus(str, Enum):
    VERIFIED = "VERIFIED"
    MISMATCH = "MISMATCH"
    PARTIALLY_MATCHED = "PARTIALLY_MATCHED"
    EXPIRED = "EXPIRED"
    OCR_FAILED = "OCR_FAILED"
    UNKNOWN_DOCUMENT = "UNKNOWN_DOCUMENT"
    PROCESSING_ERROR = "PROCESSING_ERROR"


class CheckStatus(str, Enum):
    MATCH = "MATCH"
    MISMATCH = "MISMATCH"
    VALID = "VALID"
    EXPIRED = "EXPIRED"
    NOT_YET_VALID = "NOT_YET_VALID"
    INVALID_DATE = "INVALID_DATE"
    UNKNOWN = "UNKNOWN"
    SKIPPED = "SKIPPED"


class AccountData(BaseModel):
    name: str = Field(..., description="User's full name from application account")
    date_of_birth: Optional[str] = Field(None, description="User's DOB in YYYY-MM-DD format")
    vehicle_registration_number: Optional[str] = Field(None, description="User's vehicle registration number")


class DrivingLicenseFields(BaseModel):
    name: Optional[str] = Field(None, description="Extracted licence holder name")
    date_of_birth: Optional[str] = Field(None, description="Extracted DOB (normalized YYYY-MM-DD)")
    valid_from: Optional[str] = Field(None, description="Valid from date")
    valid_until: Optional[str] = Field(None, description="Valid until date")


class RCFields(BaseModel):
    name: Optional[str] = Field(None, description="Extracted RC owner name")
    vehicle_registration_number: Optional[str] = Field(None, description="Extracted vehicle registration number")
    valid_from: Optional[str] = Field(None, description="Valid from date")
    valid_until: Optional[str] = Field(None, description="Valid until date")


class VerificationResult(BaseModel):
    status: VerificationStatus
    document_type: DocumentType
    confidence: float = Field(1.0, ge=0.0, le=1.0)
    checks: Optional[Dict[str, str]] = None
    extracted_fields: Optional[Dict[str, Any]] = None
    explanation: Optional[str] = None
    message: Optional[str] = None


class CheckOutcome(str, Enum):
    """Presentation-level outcome for a single check, derived from CheckStatus."""
    PASS = "PASS"
    FAIL = "FAIL"
    WARN = "WARN"
    SKIPPED = "SKIPPED"
    UNKNOWN = "UNKNOWN"


# CheckStatus is the validators' vocabulary; CheckOutcome is the UI's. Keeping the
# mapping in one place stops the two drifting apart.
CHECK_OUTCOME_BY_STATUS: Dict[CheckStatus, CheckOutcome] = {
    CheckStatus.MATCH: CheckOutcome.PASS,
    CheckStatus.VALID: CheckOutcome.PASS,
    CheckStatus.MISMATCH: CheckOutcome.FAIL,
    CheckStatus.EXPIRED: CheckOutcome.FAIL,
    CheckStatus.NOT_YET_VALID: CheckOutcome.WARN,
    CheckStatus.INVALID_DATE: CheckOutcome.WARN,
    CheckStatus.SKIPPED: CheckOutcome.SKIPPED,
    CheckStatus.UNKNOWN: CheckOutcome.UNKNOWN,
}


class CheckResult(BaseModel):
    """One verification check, with a sentence naming the actual values compared."""
    id: str
    label: str
    status: CheckOutcome
    rawStatus: str
    detail: str


class FieldReading(BaseModel):
    """One extracted field: what was read, what it normalized to, what we expected."""
    id: str
    label: str
    value: Optional[str] = None
    rawValue: Optional[str] = None
    expected: Optional[str] = None
    state: CheckOutcome = CheckOutcome.UNKNOWN


class ConfidenceBreakdown(BaseModel):
    """
    The components behind the headline confidence score.

    Deliberately surfaced to the UI: the score is computed from these real signals
    rather than asserted by the model, and showing the working is what makes that
    claim checkable.
    """
    fieldCompleteness: float = 0.0
    normalization: float = 0.0
    validatorAgreement: float = 0.0
    legibility: float = 0.0
    documentTypeCertainty: float = 0.0
    score: float = 0.0


class VisionExtraction(BaseModel):
    """Raw result of the single Groq vision call. No verdict, no self-scored confidence."""
    ok: bool
    document_kind: str = ""
    fields: Dict[str, Any] = {}
    transcription: str = ""
    legibility: str = "POOR"
    readable_field_count: int = 0
    model_used: Optional[str] = None
    attempts: int = 0
    latency_ms: int = 0
    failure_reason: Optional[str] = None
