import re
from typing import Optional
from app.models.schemas import DrivingLicenseFields, RCFields
from app.groq.client import GroqClient
from app.normalization.date import normalize_date
from app.normalization.vehicle_number import normalize_vehicle_number, correct_ocr_vehicle_number


class FieldExtractor:

    def __init__(self, groq_client: Optional[GroqClient] = None):
        self.groq_client = groq_client or GroqClient()

    def extract_driving_license(self, ocr_text: str) -> DrivingLicenseFields:

        if self.groq_client.is_available():
            g_data = self.groq_client.extract_driving_license_fields(ocr_text)
            name = g_data.get("name")
            dob_raw = g_data.get("date_of_birth")
            v_from_raw = g_data.get("valid_from")
            v_until_raw = g_data.get("valid_until")

            dob = normalize_date(dob_raw) if dob_raw else None
            v_from = normalize_date(v_from_raw) if v_from_raw else None
            v_until = normalize_date(v_until_raw) if v_until_raw else None

            if name and dob:
                return DrivingLicenseFields(
                    name=name,
                    date_of_birth=dob,
                    valid_from=v_from,
                    valid_until=v_until
                )
        return self._regex_extract_dl(ocr_text)

    def extract_rc(self, ocr_text: str) -> RCFields:
        if self.groq_client.is_available():
            g_data = self.groq_client.extract_rc_fields(ocr_text)
            name = g_data.get("name")
            veh_raw = g_data.get("vehicle_registration_number")
            v_from_raw = g_data.get("valid_from")
            v_until_raw = g_data.get("valid_until")

            veh_num = correct_ocr_vehicle_number(veh_raw) if veh_raw else None
            v_from = normalize_date(v_from_raw) if v_from_raw else None
            v_until = normalize_date(v_until_raw) if v_until_raw else None

            if name and veh_num:
                return RCFields(
                    name=name,
                    vehicle_registration_number=veh_num,
                    valid_from=v_from,
                    valid_until=v_until
                )

        return self._regex_extract_rc(ocr_text)

    def _regex_extract_dl(self, ocr_text: str) -> DrivingLicenseFields:
        if not ocr_text:
            return DrivingLicenseFields()

        lines = [line.strip() for line in ocr_text.split("\n") if line.strip()]

        name = None
        dob = None
        v_from = None
        v_until = None
        dob_match = re.search(r"(?:DOB|DATE OF BIRTH)[:\s]+(\d{1,2}[-/. ]\d{1,2}[-/. ]\d{4})", ocr_text, re.IGNORECASE)
        if dob_match:
            dob = normalize_date(dob_match.group(1))
        else:
            all_dates = re.findall(r"\b(\d{1,2}[-/. ]\d{1,2}[-/. ]\d{4})\b", ocr_text)
            if all_dates:
                dob = normalize_date(all_dates[0])

        name_match = re.search(r"(?:NAME|HOLDER)[:\s]+([A-Za-z\s]{3,40})", ocr_text, re.IGNORECASE)
        if name_match:
            raw_name_line = name_match.group(1).split("\n")[0].strip()
            name = raw_name_line
        else:
            for line in lines:
                if re.match(r"^[A-Z][A-Za-z\s]{3,30}$", line) and not any(kw in line.upper() for kw in ["DRIVING", "LICENCE", "INDIA", "FORM"]):
                    name = line.strip()
                    break
        valid_match = re.search(r"(?:VALID TILL|VALID UNTIL|VALID UPTO|NT|EXPIRY)[:\s]+(\d{1,2}[-/. ]\d{1,2}[-/. ]\d{4})", ocr_text, re.IGNORECASE)
        if valid_match:
            v_until = normalize_date(valid_match.group(1))

        return DrivingLicenseFields(
            name=name,
            date_of_birth=dob,
            valid_from=v_from,
            valid_until=v_until
        )

    def _regex_extract_rc(self, ocr_text: str) -> RCFields:
        if not ocr_text:
            return RCFields()

        name = None
        veh_num = None
        v_from = None
        v_until = None

        veh_match = re.search(r"\b([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4})\b", ocr_text, re.IGNORECASE)
        if veh_match:
            veh_num = correct_ocr_vehicle_number(veh_match.group(1))

        name_match = re.search(r"(?:OWNER NAME|REGISTERED OWNER|NAME)[:\s]+([A-Za-z\s]{3,40})", ocr_text, re.IGNORECASE)
        if name_match:
            raw_name_line = name_match.group(1).split("\n")[0].strip()
            name = raw_name_line
        valid_match = re.search(r"(?:FITNESS VALID UPTO|VALID UPTO|VALID TILL|EXPIRY)[:\s]+(\d{1,2}[-/. ]\d{1,2}[-/. ]\d{4})", ocr_text, re.IGNORECASE)
        if valid_match:
            v_until = normalize_date(valid_match.group(1))

        return RCFields(
            name=name,
            vehicle_registration_number=veh_num,
            valid_from=v_from,
            valid_until=v_until
        )
