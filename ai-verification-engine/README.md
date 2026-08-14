# 🪪 AI Driver Licence & RC Verification Engine

A standalone, modular, zero-retention AI-powered verification engine for Indian Driving Licences (DL) and Vehicle Registration Certificates (RC).

---

## 🚀 How to Test & Verify ID Documents

We provide a ready-to-use CLI tool [run_verification.py](file:///Users/aryanpatel.proff/Documents/ParkMitra/ai-verification-engine/run_verification.py) to test the verification engine on any real or sample Driving Licence / RC image or PDF.

### 1. Test a Driving Licence (DL)
```bash
./venv/bin/python run_verification.py \
    --document path/to/your_driving_licence.jpg \
    --name "ARYAN PATEL" \
    --dob "2005-04-12"
```

### 2. Test a Vehicle Registration Certificate (RC)
```bash
./venv/bin/python run_verification.py \
    --document path/to/your_rc_book.png \
    --name "ARYAN PATEL" \
    --vehicle "GJ01AB1234"
```

### 3. Programmatic Usage in Python

```python
from app import VerificationEngine, AccountData

# Initialize engine
engine = VerificationEngine(groq_api_key="optional_groq_key")

# Pass logged in account data
account = AccountData(
    name="ARYAN PATEL",
    date_of_birth="2005-04-12",
    vehicle_registration_number="GJ01AB1234"
)

# Pass document bytes or file path
with open("my_document.jpg", "rb") as f:
    doc_bytes = f.read()

result = engine.verify(
    document=doc_bytes,
    account_data=account,
    filename="my_document.jpg"
)

print("Status:", result.status.value)
print("Checks:", result.checks)
```

---

## 🎯 System Architecture

```text
                    USER DOCUMENT
                         │
                         ▼
                 Image / PDF Input
                         │
                         ▼
                Image Preprocessing
           (Resize, Grayscale, CLAHE,
            Denoise, Deskew Angle)
                         │
                         ▼
                    Modular OCR
         (PDFTextEngine / Image Engine)
                         │
                         ▼
              Document Classification
          (DRIVING_LICENSE / RC / UNKNOWN)
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
       DRIVING LICENCE              RC
              │                     │
              ▼                     ▼
       Field Extraction      Field Extraction
        (ONLY mandatory       (ONLY mandatory
         DL fields)            RC fields)
              │                     │
              └──────────┬──────────┘
                         │
                         ▼
                   Normalization
          (Name, DOB, Vehicle Number)
                         │
                         ▼
                Rule-Based Validation
          (Name match, DOB exact match,
           Vehicle Reg match, Expiry)
                         │
                         ▼
             Compare Against Account
                         │
                         ▼
                  Decision Engine
            (Deterministic Rule Matrix)
                         │
                         ▼
             VERIFIED / MISMATCH /
        PARTIALLY_MATCHED / EXPIRED /
       OCR_FAILED / UNKNOWN_DOCUMENT
```

---

## 📄 Supported Documents & Extracted Scope

### 🪪 Driving Licence (`DRIVING_LICENSE`)
- **Extracted Fields**: `name`, `date_of_birth`, `valid_from`, `valid_until`
- **Verification Checks**:
  ```text
  Extracted Name        ↕  Account Name
  Extracted DOB         ↕  Account Date of Birth
  Valid Until Date      ↕  Current System Date
  ```

### 🚗 Vehicle Registration Certificate (`RC`)
- **Extracted Fields**: `name`, `vehicle_registration_number`, `valid_from`, `valid_until`
- **Verification Checks**:
  ```text
  Extracted Owner Name   ↕  Account Name
  Extracted Vehicle Reg  ↕  Account Vehicle Reg Number
  Fitness Valid Until    ↕  Current System Date
  ```

---

## 🤖 Groq API Configuration

Groq acts strictly as an **AI assistance layer** for classification and field extraction.

Configure `.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
NAME_MATCH_THRESHOLD=0.90
```

---

## 🔒 Zero-Retention Privacy Policy

- **Ephemeral In-Memory Processing**: Images/PDFs process directly in memory.
- **Immediate File Cleanup**: Any temporary files are unlinked immediately.
- **Zero Sensitive Data Logging**: Telemetry logs record 0 personal info.

---

## 🧪 Testing Suite

Run all automated unit tests:

```bash
./venv/bin/pytest tests -v
```
