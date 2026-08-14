import sys
import os
import json
import argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.verification.engine import VerificationEngine
from app.models.schemas import AccountData


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
            "message": f"Document file not found at path {args.document}"
        }
        print(json.dumps(err_res))
        sys.exit(1)

    try:
        acc_dict = json.loads(args.account_json)
        account_data = AccountData(**acc_dict)
    except Exception as e:
        err_res = {
            "status": "PROCESSING_ERROR",
            "document_type": "UNKNOWN",
            "message": f"Invalid account JSON format: {str(e)}"
        }
        print(json.dumps(err_res))
        sys.exit(1)

    try:
        with open(doc_path, "rb") as f:
            doc_bytes = f.read()

        engine = VerificationEngine(groq_api_key=args.groq_key)
        result = engine.verify(
            document=doc_bytes,
            account_data=account_data,
            filename=args.filename or doc_path.name
        )

        print(json.dumps(result.model_dump()))
    except Exception as e:
        err_res = {
            "status": "PROCESSING_ERROR",
            "document_type": "UNKNOWN",
            "message": f"Engine execution error: {str(e)}"
        }
        print(json.dumps(err_res))
        sys.exit(1)


if __name__ == "__main__":
    main()
