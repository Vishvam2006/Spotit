#!/usr/bin/env python3
"""
CLI Tool to run document verification against account data.

Usage Examples:

1. Driving Licence Verification:
   ./venv/bin/python run_verification.py \
       --document sample_dl.jpg \
       --name "ARYAN PATEL" \
       --dob "2005-04-12"

2. RC Book Verification:
   ./venv/bin/python run_verification.py \
       --document sample_rc.png \
       --name "ARYAN PATEL" \
       --vehicle "GJ01AB1234"
"""

import sys
import os
import json
import argparse
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent))

from app.verification.engine import VerificationEngine
from app.models.schemas import AccountData


def main():
    parser = argparse.ArgumentParser(
        description="Verify Indian Driving Licence or RC against user account data."
    )
    parser.add_argument(
        "--document", "-d",
        required=True,
        help="Path to uploaded document file (JPG, PNG, PDF)"
    )
    parser.add_argument(
        "--name", "-n",
        required=True,
        help="User account name (e.g. 'ARYAN PATEL')"
    )
    parser.add_argument(
        "--dob", "-b",
        default=None,
        help="User account date of birth in YYYY-MM-DD format (e.g. '2005-04-12')"
    )
    parser.add_argument(
        "--vehicle", "-v",
        default=None,
        help="User account vehicle registration number (e.g. 'GJ01AB1234')"
    )
    parser.add_argument(
        "--groq-key",
        default=None,
        help="Optional Groq API key (overrides GROQ_API_KEY env var)"
    )

    args = parser.parse_args()

    doc_path = Path(args.document)
    if not doc_path.exists():
        print(f"❌ Error: File not found: {doc_path}", file=sys.stderr)
        sys.exit(1)

    account_data = AccountData(
        name=args.name,
        date_of_birth=args.dob,
        vehicle_registration_number=args.vehicle
    )

    print("\n🔍 Initializing AI Verification Engine...")
    engine = VerificationEngine(groq_api_key=args.groq_key)

    print(f"📄 Reading document: {doc_path.name}")
    with open(doc_path, "rb") as f:
        doc_bytes = f.read()

    print("⚡ Running verification pipeline...")
    result = engine.verify(
        document=doc_bytes,
        account_data=account_data,
        filename=doc_path.name
    )

    print("\n================ VERIFICATION RESULT ================")
    status_emoji = {
        "VERIFIED": "✅",
        "MISMATCH": "❌",
        "EXPIRED": "⚠️",
        "PARTIALLY_MATCHED": "⚡",
        "OCR_FAILED": "🚫",
        "UNKNOWN_DOCUMENT": "❓",
        "PROCESSING_ERROR": "💥",
    }.get(result.status.value, "ℹ️")

    print(f"Status:        {status_emoji} {result.status.value}")
    print(f"Document Type: 🪪 {result.document_type.value}")
    print(f"Confidence:    🎯 {result.confidence:.2f}")

    if result.checks:
        print("\nComponent Checks:")
        for check_name, check_val in result.checks.items():
            check_icon = "✅" if check_val in ["MATCH", "VALID"] else ("❌" if check_val in ["MISMATCH", "EXPIRED"] else "⚠️")
            print(f"  - {check_name}: {check_icon} {check_val}")

    if result.message:
        print(f"\nSummary: {result.message}")
    print("=====================================================\n")

    # Output complete JSON
    print("JSON Response:")
    print(json.dumps(result.model_dump(), indent=2))


if __name__ == "__main__":
    main()
