import sys
import os
import json
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.verification.engine import VerificationEngine

def main():
    parser = argparse.ArgumentParser(description="Bridge runner for Node.js backend")
    parser.add_argument("--document", required=True, help="Path to temp document file")
    parser.add_argument("--account-json", required=True, help="JSON string of account data")
    parser.add_argument("--filename", default=None, help="Original filename")
    parser.add_argument("--groq-key", default=None, help="Groq API key")

    args = parser.parse_args()

    doc_path = Path(args.document)
    if not doc_path.exists():
        err_res = {
            "status": "PROCESSING_ERROR",
            "document_type": "UNKNOWN",
            "confidence": 0.0,
            "message": f"Document file not found at path {args.document}"
        }
        print(json.dumps(err_res))
        sys.exit(1)

    try:
        acc_dict = json.loads(args.account_json)
    except Exception as e:
        acc_dict = {}

    expected_reg = acc_dict.get("vehicle_registration_number")
    expected_name = acc_dict.get("name")

    try:
        with open(doc_path, "rb") as f:
            doc_bytes = f.read()

        filename = args.filename or doc_path.name
        engine = VerificationEngine(groq_api_key=args.groq_key or os.getenv("GROQ_API_KEY"))
        result = engine.verify(
            document=doc_bytes,
            account_data={
                "name": expected_name or "",
                "vehicle_registration_number": expected_reg,
                "date_of_birth": acc_dict.get("date_of_birth"),
            },
            filename=filename,
        )
        extracted_fields = result.extracted_fields or {}
        res_payload = {
            "status": result.status.value,
            "document_type": result.document_type.value,
            "confidence": result.confidence,
            "checks": result.checks or {},
            "extracted_fields": extracted_fields,
            "message": result.message or "Document analyzed."
        }
        print(json.dumps(res_payload))
    except Exception as e:
        err_res = {
            "status": "PROCESSING_ERROR",
            "document_type": "UNKNOWN",
            "confidence": 0.0,
            "message": f"Engine execution error: {str(e)}"
        }
        print(json.dumps(err_res))
        sys.exit(1)

if __name__ == "__main__":
    main()
