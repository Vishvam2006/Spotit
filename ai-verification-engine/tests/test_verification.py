from datetime import date
from app.models.schemas import (
    DocumentType,
    VerificationStatus,
    CheckStatus,
)
from app.verification.engine import VerificationEngine
from app.ocr.service import OCRService, BaseOCREngine


class MockOCREngine(BaseOCREngine):
    """
    Mock OCR engine returning synthetic OCR text strings for end-to-end verification tests.
    """
    def __init__(self, mock_text: str = ""):
        self.mock_text = mock_text

    def extract_text_from_bytes(self, content_bytes: bytes, file_type: str) -> str:
        return self.mock_text


def create_test_engine(ocr_text: str) -> VerificationEngine:
    mock_engine = MockOCREngine(ocr_text)
    ocr_service = OCRService(custom_engine=mock_engine)
    return VerificationEngine(ocr_service=ocr_service)


def test_dl_exact_match_verified():
    ocr_text = """
    UNION OF INDIA
    DRIVING LICENCE
    NAME: ARYAN PATEL
    DOB: 12/04/2005
    VALID TILL: 15/05/2030
    AUTHORISED TO DRIVE: LMV
    """
    engine = create_test_engine(ocr_text)

    account_data = {
        "name": "ARYAN PATEL",
        "date_of_birth": "2005-04-12"
    }

    ref_date = date(2026, 8, 12)
    result = engine.verify(b"dummy_bytes", account_data, current_date=ref_date)

    assert result.status == VerificationStatus.VERIFIED
    assert result.document_type == DocumentType.DRIVING_LICENSE
    assert result.checks["name"] == CheckStatus.MATCH.value
    assert result.checks["date_of_birth"] == CheckStatus.MATCH.value
    assert result.checks["validity"] == CheckStatus.VALID.value


def test_dl_wrong_name_mismatch():
    ocr_text = """
    UNION OF INDIA
    DRIVING LICENCE
    NAME: RAHUL SHARMA
    DOB: 12/04/2005
    VALID TILL: 15/05/2030
    """
    engine = create_test_engine(ocr_text)

    account_data = {
        "name": "ARYAN PATEL",
        "date_of_birth": "2005-04-12"
    }

    ref_date = date(2026, 8, 12)
    result = engine.verify(b"dummy_bytes", account_data, current_date=ref_date)

    assert result.status == VerificationStatus.MISMATCH
    assert result.checks["name"] == CheckStatus.MISMATCH.value


def test_dl_wrong_dob_mismatch():
    ocr_text = """
    UNION OF INDIA
    DRIVING LICENCE
    NAME: ARYAN PATEL
    DOB: 01/01/1995
    VALID TILL: 15/05/2030
    """
    engine = create_test_engine(ocr_text)

    account_data = {
        "name": "ARYAN PATEL",
        "date_of_birth": "2005-04-12"
    }

    ref_date = date(2026, 8, 12)
    result = engine.verify(b"dummy_bytes", account_data, current_date=ref_date)

    assert result.status == VerificationStatus.MISMATCH
    assert result.checks["date_of_birth"] == CheckStatus.MISMATCH.value


def test_dl_expired():
    ocr_text = """
    UNION OF INDIA
    DRIVING LICENCE
    NAME: ARYAN PATEL
    DOB: 12/04/2005
    VALID TILL: 15/05/2020
    """
    engine = create_test_engine(ocr_text)

    account_data = {
        "name": "ARYAN PATEL",
        "date_of_birth": "2005-04-12"
    }

    ref_date = date(2026, 8, 12)
    result = engine.verify(b"dummy_bytes", account_data, current_date=ref_date)

    assert result.status == VerificationStatus.EXPIRED
    assert result.checks["validity"] == CheckStatus.EXPIRED.value


def test_rc_exact_match_verified():
    ocr_text = """
    INDIAN UNION VEHICLE REGISTRATION CERTIFICATE
    REGN NO: GJ01AB1234
    OWNER NAME: ARYAN PATEL
    CHASSIS NO: MA3EWB21S00123456
    FITNESS VALID UPTO: 15/05/2032
    """
    engine = create_test_engine(ocr_text)

    account_data = {
        "name": "ARYAN PATEL",
        "vehicle_registration_number": "GJ01AB1234"
    }

    ref_date = date(2026, 8, 12)
    result = engine.verify(b"dummy_bytes", account_data, current_date=ref_date)

    assert result.status == VerificationStatus.VERIFIED
    assert result.document_type == DocumentType.RC
    assert result.checks["name"] == CheckStatus.MATCH.value
    assert result.checks["vehicle_registration_number"] == CheckStatus.MATCH.value
    assert result.checks["validity"] == CheckStatus.VALID.value


def test_rc_wrong_vehicle_number_mismatch():
    ocr_text = """
    INDIAN UNION VEHICLE REGISTRATION CERTIFICATE
    REGN NO: MH12CD5678
    OWNER NAME: ARYAN PATEL
    FITNESS VALID UPTO: 15/05/2032
    """
    engine = create_test_engine(ocr_text)

    account_data = {
        "name": "ARYAN PATEL",
        "vehicle_registration_number": "GJ01AB1234"
    }

    ref_date = date(2026, 8, 12)
    result = engine.verify(b"dummy_bytes", account_data, current_date=ref_date)

    assert result.status == VerificationStatus.MISMATCH
    assert result.checks["vehicle_registration_number"] == CheckStatus.MISMATCH.value


def test_rc_expired():
    ocr_text = """
    INDIAN UNION VEHICLE REGISTRATION CERTIFICATE
    REGN NO: GJ01AB1234
    OWNER NAME: ARYAN PATEL
    FITNESS VALID UPTO: 15/05/2020
    """
    engine = create_test_engine(ocr_text)

    account_data = {
        "name": "ARYAN PATEL",
        "vehicle_registration_number": "GJ01AB1234"
    }

    ref_date = date(2026, 8, 12)
    result = engine.verify(b"dummy_bytes", account_data, current_date=ref_date)

    assert result.status == VerificationStatus.EXPIRED
    assert result.checks["validity"] == CheckStatus.EXPIRED.value


def test_unknown_document():
    ocr_text = """
    RESTAURANT RECEIPT
    Total: Rs 500
    Date: 12/08/2026
    """
    engine = create_test_engine(ocr_text)

    account_data = {
        "name": "ARYAN PATEL"
    }

    result = engine.verify(b"dummy_bytes", account_data)

    assert result.status == VerificationStatus.UNKNOWN_DOCUMENT
    assert result.document_type == DocumentType.UNKNOWN


def test_unreadable_document_ocr_failed():
    engine = create_test_engine("")

    account_data = {
        "name": "ARYAN PATEL"
    }

    result = engine.verify(b"dummy_bytes", account_data)

    assert result.status == VerificationStatus.OCR_FAILED
    assert result.document_type == DocumentType.UNKNOWN
