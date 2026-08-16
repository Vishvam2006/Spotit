import os
import base64
import json
import re
import hmac
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import dotenv

dotenv.load_dotenv()

app = FastAPI(title="ParkMitra AI Verification Engine", version="1.0.0")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "AI_ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
AI_ENGINE_API_KEY = os.getenv("AI_ENGINE_API_KEY", "")

# Document analysis needs a *vision* model. GROQ_MODEL is the text model used
# elsewhere in the engine and cannot accept image input, so the vision models
# are configured separately. The llama-3.2-*-vision-preview models this used to
# call were decommissioned by Groq and always errored, which silently pushed
# every upload into fallback_document_analysis() -> INVALID_DOCUMENT.
GROQ_VISION_MODELS = [
    model.strip()
    for model in os.getenv(
        "GROQ_VISION_MODELS",
        "qwen/qwen3.6-27b",
    ).split(",")
    if model.strip()
]

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_FILES = 10


@app.middleware("http")
async def require_api_key(request: Request, call_next):
    """Require a shared secret when AI_ENGINE_API_KEY is configured."""
    if AI_ENGINE_API_KEY:
        provided = request.headers.get("X-API-Key", "")
        if not provided or not hmac.compare_digest(provided, AI_ENGINE_API_KEY):
            raise HTTPException(
                status_code=401,
                detail="Invalid or missing API key.",
            )
    return await call_next(request)

class ExtractedFields(BaseModel):
    documentType: str  # VEHICLE_RC, DRIVING_LICENSE, IDENTITY_PROOF, PARKING_PERMIT, INVALID_DOCUMENT
    documentNumber: Optional[str] = None
    ownerName: Optional[str] = None
    vehicleNumber: Optional[str] = None
    vehicleClass: Optional[str] = None
    issueDate: Optional[str] = None
    expiryDate: Optional[str] = None
    issuingAuthority: Optional[str] = None

class DocumentResult(BaseModel):
    filename: str
    documentType: str
    status: str  # VERIFIED, NEEDS_REVIEW, REJECTED
    confidenceScore: float
    extractedFields: ExtractedFields
    checks: dict
    summary: str

class VerificationResponse(BaseModel):
    success: bool
    verificationId: str
    overallStatus: str  # VERIFIED, NEEDS_REVIEW, REJECTED
    overallConfidence: float
    documents: List[DocumentResult]
    summary: str

def get_groq_client():
    if not GROQ_API_KEY:
        return None
    try:
        from groq import Groq
        return Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"Error initializing Groq client: {e}")
        return None

def extract_json_object(text: Optional[str]) -> Optional[dict]:
    """
    Pulls the JSON object out of a model reply.

    Reasoning-capable vision models (the current default emits <think> blocks)
    wrap the answer in prose that can itself contain braces, so a greedy
    first-brace-to-last-brace match is unreliable. This scans for the first
    brace-balanced object that parses, ignoring braces inside strings.
    """
    if not text:
        return None

    stripped = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)

    for start, char in enumerate(stripped):
        if char != "{":
            continue
        depth = 0
        in_string = False
        escaped = False
        for end in range(start, len(stripped)):
            current = stripped[end]
            if in_string:
                if escaped:
                    escaped = False
                elif current == "\\":
                    escaped = True
                elif current == '"':
                    in_string = False
                continue
            if current == '"':
                in_string = True
            elif current == "{":
                depth += 1
            elif current == "}":
                depth -= 1
                if depth == 0:
                    try:
                        parsed = json.loads(stripped[start : end + 1])
                    except json.JSONDecodeError:
                        break
                    if isinstance(parsed, dict):
                        return parsed
                    break
    return None


def detect_mime_type(content: bytes) -> str:
    """Sniffs the upload's real type; the vision API rejects a wrong data: prefix."""
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    if content.startswith(b"%PDF-"):
        return "application/pdf"
    return "image/jpeg"


def analyze_image_with_groq(image_bytes: bytes, filename: str) -> dict:
    client = get_groq_client()
    mime_type = detect_mime_type(image_bytes)

    if mime_type == "application/pdf":
        # The vision models take images only. Rather than send a PDF and get a
        # generic failure, say so plainly so the caller can act on it.
        return unavailable_document_analysis(
            "PDF documents cannot be scanned by the vision model. "
            "Please upload a photo (JPG, PNG, or WEBP) of the document."
        )

    base64_image = base64.b64encode(image_bytes).decode('utf-8')

    prompt = """
You are an expert strict Document Verification AI for a Smart Parking System.
Examine the provided image very carefully.

CRITICAL INSTRUCTION FOR INVALID / NON-DOCUMENT IMAGES:
First, check if this image is actually an official document (such as a Vehicle Registration Certificate (RC Book/Smartcard), Driving License, Govt ID Card, or Official Parking Pass).
If the image is a picture of a vehicle/car itself, a parking slot, a building, a landscape, a person, a selfie, a random object, or an unreadable/blurred non-document image:
- documentType MUST be "INVALID_DOCUMENT"
- documentNumber: null
- ownerName: null
- vehicleNumber: null
- vehicleClass: null
- confidenceScore MUST be 0.05
- summary: "Uploaded image is not a valid document or RC Book."

IF AND ONLY IF the image is a legitimate official document:
1. documentType: One of ["VEHICLE_RC", "DRIVING_LICENSE", "IDENTITY_PROOF", "PARKING_PERMIT"]
2. documentNumber: Registration No, License No, or ID No printed on the document.
3. ownerName: Full name of owner/holder as printed.
4. vehicleNumber: Standardized Indian vehicle registration number if present (e.g. MH02CB1234, DL01AB1234, KA05XY9999).
5. vehicleClass: LMV, Car, MCWG, Commercial, etc.
6. issueDate: YYYY-MM-DD or readable date.
7. expiryDate: YYYY-MM-DD or readable date.
8. issuingAuthority: State RTO or issuing agency.
9. confidenceScore: Float from 0.70 to 1.00 based on legibility.
10. summary: Brief sentence summarizing extracted details.

Return ONLY valid JSON matching this exact structure:
{
  "documentType": "VEHICLE_RC",
  "documentNumber": "MH02CB1234",
  "ownerName": "John Doe",
  "vehicleNumber": "MH02CB1234",
  "vehicleClass": "LMV (Car)",
  "issueDate": "2021-05-10",
  "expiryDate": "2036-05-09",
  "issuingAuthority": "RTO Mumbai",
  "confidenceScore": 0.95,
  "summary": "Legitimate Vehicle RC for MH02CB1234."
}
"""

    if not client:
        return unavailable_document_analysis(
            "AI document analysis is not configured (GROQ_API_KEY is missing)."
        )

    for model in GROQ_VISION_MODELS:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                temperature=0.0,
                # Reasoning-capable vision models spend a large part of the
                # budget on a <think> block before emitting the JSON. At 800 the
                # reply was truncated mid-reasoning and no JSON ever arrived.
                max_tokens=2500,
            )
            parsed = extract_json_object(response.choices[0].message.content)
            if parsed is not None:
                return parsed
        except Exception as ex:
            print(f"Vision model {model} attempt failed: {ex}")
            continue

    return unavailable_document_analysis(
        "AI document analysis is temporarily unavailable; the document was not verified."
    )

def unavailable_document_analysis(reason: str) -> dict:
    """
    Used when the engine could not inspect the document at all. This is NOT the
    same as deciding the image is not a document, so it is flagged with
    `analysisUnavailable` and routed to NEEDS_REVIEW rather than REJECTED —
    telling a user their valid RC "is not a document" because the AI was down
    is a wrong answer, not a strict one.
    """
    return {
        "documentType": "UNKNOWN",
        "documentNumber": None,
        "ownerName": None,
        "vehicleNumber": None,
        "vehicleClass": None,
        "issueDate": None,
        "expiryDate": None,
        "issuingAuthority": None,
        "confidenceScore": 0.0,
        "analysisUnavailable": True,
        "summary": reason,
    }

@app.get("/")
def read_root():
    return {"status": "ok", "service": "ParkMitra AI Verification Engine", "model": GROQ_MODEL}

@app.post("/verify-documents", response_model=VerificationResponse)
async def verify_documents(
    files: List[UploadFile] = File(...),
    expectedRegistration: Optional[str] = Form(None),
    expectedName: Optional[str] = Form(None)
):
    if not files:
        raise HTTPException(status_code=400, detail="No document files provided")

    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"At most {MAX_FILES} files per request.")

    results: List[DocumentResult] = []
    total_score = 0.0

    for index, file in enumerate(files):
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail="Uploaded file is too large. Maximum allowed size is 15MB.",
            )
        analysis = analyze_image_with_groq(content, file.filename or f"doc_{index+1}.jpg")

        doc_type = analysis.get("documentType", "INVALID_DOCUMENT")
        confidence = float(analysis.get("confidenceScore", 0.05))
        analysis_unavailable = bool(analysis.get("analysisUnavailable"))

        veh_num = analysis.get("vehicleNumber")
        owner_name = analysis.get("ownerName")
        exp_date = analysis.get("expiryDate")

        is_valid_format = doc_type in ["VEHICLE_RC", "DRIVING_LICENSE", "IDENTITY_PROOF", "PARKING_PERMIT"]

        reg_check = True
        if expectedRegistration:
            if veh_num:
                clean_exp = re.sub(r'[^A-Z0-9]', '', expectedRegistration.upper())
                clean_actual = re.sub(r'[^A-Z0-9]', '', veh_num.upper())
                reg_check = (clean_exp in clean_actual) or (clean_actual in clean_exp)
            else:
                reg_check = False

        name_check = True
        if expectedName and owner_name:
            name_check = expectedName.lower().split()[0] in owner_name.lower()

        checks = {
            "formatValid": is_valid_format,
            "registrationMatch": reg_check if is_valid_format else False,
            "nameMatch": name_check if is_valid_format else False,
            "expiryCheck": True if is_valid_format else False
        }

        if analysis_unavailable:
            # The engine never saw the document, so it can neither pass nor fail it.
            status = "NEEDS_REVIEW"
        elif is_valid_format and all(checks.values()) and confidence >= 0.70:
            status = "VERIFIED"
        elif is_valid_format and confidence >= 0.50:
            status = "NEEDS_REVIEW"
        else:
            status = "REJECTED"

        extracted = ExtractedFields(
            documentType=doc_type,
            documentNumber=analysis.get("documentNumber"),
            ownerName=owner_name,
            vehicleNumber=veh_num,
            vehicleClass=analysis.get("vehicleClass"),
            issueDate=analysis.get("issueDate"),
            expiryDate=exp_date,
            issuingAuthority=analysis.get("issuingAuthority")
        )

        doc_result = DocumentResult(
            filename=file.filename or f"Document_{index+1}",
            documentType=doc_type,
            status=status,
            confidenceScore=confidence,
            extractedFields=extracted,
            checks=checks,
            summary=analysis.get("summary", "Document verification failed.")
        )
        results.append(doc_result)
        total_score += confidence

    avg_confidence = round(total_score / len(results), 2)
    has_rejected = any(r.status == "REJECTED" for r in results)
    has_review = any(r.status == "NEEDS_REVIEW" for r in results)

    if has_rejected:
        overall_status = "REJECTED"
        overall_summary = "Document verification failed. The uploaded image is not a valid RC Book or registration does not match."
    elif has_review:
        overall_status = "NEEDS_REVIEW"
        blocked = [r.summary for r in results if r.confidenceScore == 0.0]
        overall_summary = (
            blocked[0]
            if blocked
            else "Documents processed. Details require manual verification."
        )
    else:
        overall_status = "VERIFIED"
        overall_summary = f"All document(s) verified successfully against vehicle registration record."

    return VerificationResponse(
        success=True,
        verificationId=f"ver_{os.urandom(4).hex()}",
        overallStatus=overall_status,
        overallConfidence=avg_confidence,
        documents=results,
        summary=overall_summary
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
