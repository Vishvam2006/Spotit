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
    explanation: Optional[str] = None
    message: Optional[str] = None
