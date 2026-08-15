import sys
import os
import json
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from main import analyze_image_with_groq

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
        analysis = analyze_image_with_groq(doc_bytes, filename)

        doc_type = analysis.get("documentType", "INVALID_DOCUMENT")
        confidence = float(analysis.get("confidenceScore", 0.05))

        veh_num = analysis.get("vehicleNumber")
        owner_name = analysis.get("ownerName")

        is_valid_doc = doc_type in ["VEHICLE_RC", "DRIVING_LICENSE", "IDENTITY_PROOF", "PARKING_PERMIT"]

        reg_match = True
        if expected_reg:
            if veh_num:
                clean_exp = "".join(c for c in expected_reg.upper() if c.isalnum())
                clean_act = "".join(c for c in veh_num.upper() if c.isalnum())
                reg_match = (clean_exp in clean_act) or (clean_act in clean_exp)
            else:
                reg_match = False

        if is_valid_doc and reg_match and confidence >= 0.70:
            status = "VERIFIED"
        elif is_valid_doc and confidence >= 0.50:
            status = "PARTIALLY_MATCHED"
        else:
            status = "MISMATCH" if is_valid_doc else "UNKNOWN_DOCUMENT"

        res_payload = {
            "status": status,
            "document_type": "RC" if doc_type == "VEHICLE_RC" else ("DRIVING_LICENSE" if doc_type == "DRIVING_LICENSE" else "UNKNOWN"),
            "confidence": confidence,
            "checks": {
                "formatValid": str(is_valid_doc).lower(),
                "registrationMatch": str(reg_match).lower()
            },
            "message": analysis.get("summary", "Document analyzed.")
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
