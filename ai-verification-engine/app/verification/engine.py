import logging
from typing import Union, Dict, Any, Optional
from datetime import date

from app.models.schemas import (
    AccountData,
    DocumentType,
    VerificationStatus,
    VerificationResult,
)
from app.ocr.service import OCRService
from app.classifier.document_classifier import DocumentClassifier
from app.extraction.field_extractor import FieldExtractor
from app.groq.client import GroqClient
from app.validation.name_validator import validate_name
from app.validation.dob_validator import validate_dob
from app.validation.vehicle_validator import validate_vehicle_number
from app.validation.validity_validator import validate_validity
from app.verification.decision import evaluate_dl_decision, evaluate_rc_decision

# Set up clean logging with zero PII
logger = logging.getLogger("VerificationEngine")
logger.setLevel(logging.INFO)


class VerificationEngine:
    """
    Standalone AI-Powered Verification Engine for Indian Driving Licences & RCs.
    
    Guarantees:
    - 100% Zero Data Retention (Ephemeral in-memory processing).
    - Rule-based deterministic decision matrix (Groq is AI assist layer only).
    - Sanitized telemetry logging with zero PII.
    """

    def __init__(
        self,
        groq_api_key: Optional[str] = None,
        ocr_service: Optional[OCRService] = None
    ):
        self.groq_client = GroqClient(api_key=groq_api_key)
        self.ocr_service = ocr_service or OCRService()
        self.classifier = DocumentClassifier(groq_client=self.groq_client)
        self.extractor = FieldExtractor(groq_client=self.groq_client)

    def verify(
        self,
        document: Union[bytes, str],
        account_data: Union[Dict[str, Any], AccountData],
        filename: Optional[str] = None,
        current_date: Optional[date] = None
    ) -> VerificationResult:
        """
        Main entry point for document verification against application account data.
        
        Args:
            document: Binary bytes or local file path of uploaded DL/RC image or PDF.
            account_data: Account data dictionary containing 'name', optional 'date_of_birth', and optional 'vehicle_registration_number'.
            filename: Optional original filename for file format hint.
            current_date: Optional reference date for testing (defaults to today).
            
        Returns:
            VerificationResult detailing verification status and component check results.
        """
        logger.info("Verification process started")

        # 1. Parse Account Data
        if isinstance(account_data, dict):
            acc = AccountData(**account_data)
        elif isinstance(account_data, AccountData):
            acc = account_data
        else:
            logger.error("Invalid account data format provided")
            return VerificationResult(
                status=VerificationStatus.PROCESSING_ERROR,
                document_type=DocumentType.UNKNOWN,
                message="Invalid account data format provided."
            )

        # 2. In-memory OCR Extraction
        try:
            ocr_text = self.ocr_service.process_document(document, filename=filename)
        except Exception as e:
            logger.error(f"OCR execution failed: {str(e)}")
            return VerificationResult(
                status=VerificationStatus.OCR_FAILED,
                document_type=DocumentType.UNKNOWN,
                message="Failed to perform OCR on uploaded document."
            )

        if not ocr_text or not ocr_text.strip():
            logger.info("OCR returned empty text output")
            return VerificationResult(
                status=VerificationStatus.OCR_FAILED,
                document_type=DocumentType.UNKNOWN,
                message="Document is unreadable or empty."
            )

        logger.info("OCR text extracted successfully in memory")

        # 3. Document Classification
        doc_type, confidence = self.classifier.classify(ocr_text)
        logger.info(f"Document classified as: {doc_type.value} with confidence: {confidence}")

        if doc_type == DocumentType.UNKNOWN or confidence < 0.50:
            logger.info("Document type is UNKNOWN or insufficient confidence")
            # Discard OCR text
            del ocr_text
            return VerificationResult(
                status=VerificationStatus.UNKNOWN_DOCUMENT,
                document_type=DocumentType.UNKNOWN,
                confidence=confidence,
                message="Uploaded document is not a recognized Driving Licence or RC."
            )

        # 4. Field Extraction & Validation
        try:
            if doc_type == DocumentType.DRIVING_LICENSE:
                result = self._verify_dl(ocr_text, acc, confidence, current_date=current_date)
            elif doc_type == DocumentType.RC:
                result = self._verify_rc(ocr_text, acc, confidence, current_date=current_date)
            else:
                result = VerificationResult(
                    status=VerificationStatus.UNKNOWN_DOCUMENT,
                    document_type=DocumentType.UNKNOWN,
                    confidence=confidence,
                    message="Unsupported document type."
                )
        finally:
            # 5. Zero-Retention Discard of Raw OCR Text
            del ocr_text
            logger.info("Raw OCR text and intermediate fields discarded from memory")

        logger.info(f"Verification completed with result: {result.status.value}")
        return result

    def _verify_dl(
        self,
        ocr_text: str,
        acc: AccountData,
        confidence: float,
        current_date: Optional[date] = None
    ) -> VerificationResult:
        dl_fields = self.extractor.extract_driving_license(ocr_text)

        # Check 1: Name validation
        name_status, _ = validate_name(dl_fields.name or "", acc.name)

        # Check 2: DOB validation
        dob_status, _ = validate_dob(dl_fields.date_of_birth or "", acc.date_of_birth or "", ref_date=current_date)

        # Check 3: Validity validation
        validity_status = validate_validity(dl_fields.valid_until, dl_fields.valid_from, current_date=current_date)

        # Deterministic Decision
        result = evaluate_dl_decision(name_status, dob_status, validity_status, confidence=confidence)
        result.extracted_fields = {
            "name": dl_fields.name,
            "date_of_birth": dl_fields.date_of_birth,
            "valid_from": dl_fields.valid_from,
            "valid_until": dl_fields.valid_until,
        }
        return result

    def _verify_rc(
        self,
        ocr_text: str,
        acc: AccountData,
        confidence: float,
        current_date: Optional[date] = None
    ) -> VerificationResult:
        rc_fields = self.extractor.extract_rc(ocr_text)

        # Check 1: Name validation
        name_status, _ = validate_name(rc_fields.name or "", acc.name)

        # Check 2: Vehicle Registration Number validation
        veh_status, _ = validate_vehicle_number(
            rc_fields.vehicle_registration_number or "",
            acc.vehicle_registration_number or ""
        )

        # Check 3: Validity validation
        validity_status = validate_validity(rc_fields.valid_until, rc_fields.valid_from, current_date=current_date)

        # Deterministic Decision
        result = evaluate_rc_decision(name_status, veh_status, validity_status, confidence=confidence)
        result.extracted_fields = {
            "name": rc_fields.name,
            "vehicle_registration_number": rc_fields.vehicle_registration_number,
            "valid_from": rc_fields.valid_from,
            "valid_until": rc_fields.valid_until,
        }
        return result
