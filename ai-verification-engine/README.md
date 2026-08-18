# 🪪 AI Driver Licence & RC Verification Engine

A standalone, modular, zero-retention AI-powered verification engine for Indian Driving Licences (DL) and Vehicle Registration Certificates (RC).

---

## 🚀 How to Test & Verify ID Documents

We provide a ready-to-use CLI tool [`run_verification.py`](run_verification.py) to test the verification engine on any real or sample Driving Licence / RC image or PDF.

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

This is the path `main.py` actually executes for every upload. The vision model
**reads** the document; the deterministic rule engine **decides** the verdict.

```text
                    USER DOCUMENT (image or PDF)
                                │
                                ▼
                  Groq Vision Extraction  (app/vision/)
        one call: document kind + transcription + raw fields
             extraction only — no verdict, no self-scored
             confidence, image text treated as untrusted data
                                │
                                ▼
                   Sanitization (app/vision/sanitize.py)
          control chars stripped, lengths capped, prompt-injection
                        patterns rejected
                                │
                                ▼
              Document Classification (app/classifier/)
     keyword/regex rules over the transcription — an independent
        second opinion, cross-checked against the vision kind
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
             DRIVING LICENCE                RC
                    │                       │
                    ▼                       ▼
             Field Mapping           Field Mapping
                    └───────────┬───────────┘
                                ▼
                  Normalization (app/normalization/)
        name casing · date formats · OCR letter/digit confusion
                  ("GJ O1 AB I234" → "GJ01AB1234")
                                │
                                ▼
                Rule-Based Validation (app/validation/)
      name fuzzy match (0.90) · DOB exact · registration equality
                    · real expiry date arithmetic
                                │
                                ▼
                Decision Matrix (app/verification/decision.py)
       VERIFIED · MISMATCH · PARTIALLY_MATCHED · EXPIRED ·
       OCR_FAILED · UNKNOWN_DOCUMENT · PROCESSING_ERROR
                                │
                                ▼
              Derived Confidence (app/verification/confidence.py)
     field completeness · validator agreement · normalization ·
              legibility · document-type certainty
        (confidence describes how well we READ the document;
              it never influences the verdict)
```

### What the checks actually do

| Check | Backed by |
|---|---|
| Document type | Vision kind + keyword classifier agreement |
| Name | `rapidfuzz` similarity against the account name, 0.90 threshold |
| Registration | Full equality after normalization and OCR-confusion correction |
| Validity | Real date arithmetic against today — an expired document fails |

Every check returns a sentence naming the values compared, e.g.
`"Expired on 15 May 2020, 2,286 days ago."`

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

> Use `run_verification.py` to test a document from the CLI without the stack.

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
document, and nothing is persisted against the user's vehicle.

Run `GET /health` before demoing: it reports which of your configured vision
models this account can actually reach.

### Skipped checks

A check with nothing to compare against is `SKIPPED`, not failed. The `User`
model has no date-of-birth column, so DL date-of-birth is normally skipped and
the licence is decided on the name alone; likewise the registration check when
no vehicle is selected. Without this a valid licence would be rejected 100% of
the time.

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
