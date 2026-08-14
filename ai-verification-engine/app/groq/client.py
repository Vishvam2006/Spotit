import os
import json
import re
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

try:
    from groq import Groq
    HAS_GROQ_SDK = True
except ImportError:
    HAS_GROQ_SDK = False


class GroqClient:
    """
    Groq API Client for AI assistance layer.
    Handles document classification, OCR interpretation, and field extraction assistance.
    
    CRITICAL: Groq provides assistance ONLY and DOES NOT make final verification decisions.
    Zero retention policy enforced: No prompts or responses containing personal data are logged or saved.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY", "")
        self.model = model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        self.client = None
        if HAS_GROQ_SDK and self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
            except Exception:
                self.client = None

    def is_available(self) -> bool:
        return self.client is not None

    def classify_document(self, ocr_text: str) -> Dict[str, Any]:
        """
        Classifies OCR text into DRIVING_LICENSE, RC, or UNKNOWN with confidence score.
        Returns dict: {"document_type": str, "confidence": float}
        """
        if not self.is_available() or not ocr_text.strip():
            return {"document_type": "UNKNOWN", "confidence": 0.0}

        prompt = f"""
Analyze the following document OCR text and classify it into one of these exact types:
- DRIVING_LICENSE (Indian Driving Licence)
- RC (Indian Vehicle Registration Certificate / RC Book)
- UNKNOWN (Any other document, invoice, receipt, or unreadable document)

OCR Text:
\"\"\"
{ocr_text[:1500]}
\"\"\"

Respond strictly in valid JSON format:
{{
  "document_type": "DRIVING_LICENSE" | "RC" | "UNKNOWN",
  "confidence": float between 0.0 and 1.0
}}
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an Indian government identity document classifier. Respond only in valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            data = json.loads(content)
            
            doc_type = data.get("document_type", "UNKNOWN").upper()
            if doc_type not in ["DRIVING_LICENSE", "RC", "UNKNOWN"]:
                doc_type = "UNKNOWN"
            
            confidence = float(data.get("confidence", 0.5))
            return {"document_type": doc_type, "confidence": confidence}
        except Exception:
            return {"document_type": "UNKNOWN", "confidence": 0.0}

    def extract_driving_license_fields(self, ocr_text: str) -> Dict[str, Optional[str]]:
        """
        Extracts ONLY: name, date_of_birth, valid_from, valid_until from DL text.
        Ignores address, father's name, blood group, photo, phone, licence number, etc.
        """
        if not self.is_available() or not ocr_text.strip():
            return {"name": None, "date_of_birth": None, "valid_from": None, "valid_until": None}

        prompt = f"""
Extract ONLY the required fields from this Indian Driving Licence OCR text:
1. Name (Full name of the licence holder)
2. Date of Birth (DOB)
3. Valid From (issue date / valid from)
4. Valid Until (expiry date / valid till / NT / TR)

Do NOT extract address, licence number, blood group, father's name, or any other field.

OCR Text:
\"\"\"
{ocr_text}
\"\"\"

Respond strictly in valid JSON format:
{{
  "name": "extracted name or null",
  "date_of_birth": "extracted DOB string or null",
  "valid_from": "valid from string or null",
  "valid_until": "valid till string or null"
}}
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a precise field extraction assistant for Indian Driving Licences. Respond only in JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            data = json.loads(content)
            return {
                "name": data.get("name"),
                "date_of_birth": data.get("date_of_birth"),
                "valid_from": data.get("valid_from"),
                "valid_until": data.get("valid_until"),
            }
        except Exception:
            return {"name": None, "date_of_birth": None, "valid_from": None, "valid_until": None}

    def extract_rc_fields(self, ocr_text: str) -> Dict[str, Optional[str]]:
        """
        Extracts ONLY: name, vehicle_registration_number, valid_from, valid_until from RC text.
        Ignores chassis number, engine number, fuel type, model, address, etc.
        """
        if not self.is_available() or not ocr_text.strip():
            return {"name": None, "vehicle_registration_number": None, "valid_from": None, "valid_until": None}

        prompt = f"""
Extract ONLY the required fields from this Indian Vehicle Registration Certificate (RC) OCR text:
1. Owner Name (Registered Owner Name)
2. Vehicle Registration Number (e.g. GJ01AB1234, MH12CD5678, DL01A0001)
3. Valid From (Registration Date / Valid From)
4. Valid Until (Fitness Valid Up to / Registration Expiry Date)

Do NOT extract chassis number, engine number, maker, vehicle model, address, or fuel type.

OCR Text:
\"\"\"
{ocr_text}
\"\"\"

Respond strictly in valid JSON format:
{{
  "name": "extracted owner name or null",
  "vehicle_registration_number": "extracted vehicle registration number or null",
  "valid_from": "valid from string or null",
  "valid_until": "valid till string or null"
}}
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a precise field extraction assistant for Indian Vehicle Registration Certificates (RC). Respond only in JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            data = json.loads(content)
            return {
                "name": data.get("name"),
                "vehicle_registration_number": data.get("vehicle_registration_number"),
                "valid_from": data.get("valid_from"),
                "valid_until": data.get("valid_until"),
            }
        except Exception:
            return {"name": None, "vehicle_registration_number": None, "valid_from": None, "valid_until": None}
