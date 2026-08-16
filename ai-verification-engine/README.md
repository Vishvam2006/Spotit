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

## 🔌 Running the Service for ParkMitra

The Node backend calls this engine over HTTP at `AI_VERIFICATION_URL`
(default `http://127.0.0.1:8000/verify-documents`), which is served by
**`main.py`**. Start it before using the `/verification` page:

```bash
cd ai-verification-engine
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
cp .env.example .env        # then fill in GROQ_API_KEY
./venv/bin/python main.py   # serves http://127.0.0.1:8000
```

If the engine is unreachable, the backend automatically falls back to running
`bridge.py` as a subprocess — it prefers `./venv/bin/python` and otherwise uses
whatever `python3` is on `PATH`, so the venv above is what makes the fallback
work too.

> `server.py` is a **standalone browser tester** on port 8080 with its own
> single-document `/api/verify` contract. The backend does not talk to it.

## 🤖 Groq API Configuration

Groq acts strictly as an **AI assistance layer** for classification and field extraction.

Configure `.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
NAME_MATCH_THRESHOLD=0.90
```

`GROQ_MODEL` is a **text** model, used for OCR-text classification and field
extraction. Document image analysis in `main.py` needs a **vision** model and is
configured separately via `GROQ_VISION_MODELS` (comma-separated, tried in
order):

```env
GROQ_VISION_MODELS=qwen/qwen3.6-27b
```

Groq's model catalog varies per account, and a wrong id fails with a 404 that is
easy to miss. Check what your key can actually reach before changing this:

```bash
curl -s https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY" | python3 -m json.tool
```

Two things to know about the current default:

- `qwen/qwen3.6-27b` is a **reasoning** model: it emits a `<think>` block before
  the JSON answer. `max_tokens` must stay high enough (currently 2500) for the
  JSON to survive, or the reply is truncated mid-reasoning and no result arrives.
- The older `llama-3.2-*-vision-preview` models were decommissioned by Groq, and
  `GROQ_MODEL` is text-only — neither can be used here.

Without a working key or vision model, the engine reports `NEEDS_REVIEW` with an
explanatory summary — it does **not** claim the uploaded image is an invalid
document.

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
