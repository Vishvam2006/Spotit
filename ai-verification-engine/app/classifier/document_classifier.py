import re
from typing import Tuple, Optional
from app.models.schemas import DocumentType
from app.groq.client import GroqClient


DL_KEYWORDS = [
    "DRIVING LICENCE", "DRIVING LICENSE", "UNION OF INDIA", "FORM 7",
    "LICENCE NO", "LICENSE NO", "DATE OF BIRTH", "DOB", "AUTHORISED TO DRIVE",
    "DL NO", "TRANSPORT LICENCE", "NON-TRANSPORT", "ISSUE DATE"
]

RC_KEYWORDS = [
    "REGISTRATION CERTIFICATE", "REGN NO", "REGISTRATION NO", "VEHICLE NO",
    "CHASSIS NO", "ENGINE NO", "OWNER NAME", "REGISTERED OWNER",
    "FITNESS VALID UPTO", "FITNESS VALID", "RC BOOK", "FORM 23",
    "MAKER", "MODEL", "UNLADEN WT", "HP/CC"
]


class DocumentClassifier:

    def __init__(self, groq_client: Optional[GroqClient] = None, min_confidence: float = 0.55):
        self.groq_client = groq_client or GroqClient()
        self.min_confidence = min_confidence

    def classify(self, ocr_text: str) -> Tuple[DocumentType, float]:
        if not ocr_text or not ocr_text.strip():
            return DocumentType.UNKNOWN, 0.0

        upper_text = ocr_text.upper()

        dl_score = sum(1 for kw in DL_KEYWORDS if kw in upper_text)
        rc_score = sum(1 for kw in RC_KEYWORDS if kw in upper_text)

        has_vehicle_reg_pattern = bool(re.search(r"\b[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}\b", upper_text))
        if has_vehicle_reg_pattern:
            rc_score += 2
        has_dl_num_pattern = bool(re.search(r"\b[A-Z]{2}[-\s]?\d{2}[-\s]?\d{4,11}\b", upper_text))
        if has_dl_num_pattern and "DOB" in upper_text:
            dl_score += 2

        rule_type = DocumentType.UNKNOWN
        rule_confidence = 0.0

        if dl_score > rc_score and dl_score >= 2:
            rule_type = DocumentType.DRIVING_LICENSE
            rule_confidence = min(0.6 + (dl_score * 0.1), 0.98)
        elif rc_score > dl_score and rc_score >= 2:
            rule_type = DocumentType.RC
            rule_confidence = min(0.6 + (rc_score * 0.1), 0.98)
        if self.groq_client.is_available():
            groq_res = self.groq_client.classify_document(ocr_text)
            g_doc_str = groq_res.get("document_type", "UNKNOWN")
            g_conf = groq_res.get("confidence", 0.0)

            if g_doc_str == "DRIVING_LICENSE":
                g_doc_type = DocumentType.DRIVING_LICENSE
            elif g_doc_str == "RC":
                g_doc_type = DocumentType.RC
            else:
                g_doc_type = DocumentType.UNKNOWN
            if rule_type == g_doc_type and rule_type != DocumentType.UNKNOWN:
                combined_conf = min(0.99, max(rule_confidence, g_conf) + 0.1)
                return rule_type, round(combined_conf, 2)
            elif g_conf >= 0.80 and g_doc_type != DocumentType.UNKNOWN:
                return g_doc_type, round(g_conf, 2)
            elif rule_confidence >= self.min_confidence:
                return rule_type, round(rule_confidence, 2)
            else:
                return DocumentType.UNKNOWN, round(max(rule_confidence, g_conf), 2)

        if rule_confidence >= self.min_confidence:
            return rule_type, round(rule_confidence, 2)

        return DocumentType.UNKNOWN, 0.0
