"""
ParkMitra AI Verification Engine -- HTTP service consumed by the Node backend.

This file is the transport shell: CORS, auth, upload limits, concurrency and a
time budget. All verification logic lives in app/, so the pipeline the README
describes is the pipeline that actually runs:

    image -> vision extraction -> classification -> normalization ->
    deterministic validators -> decision matrix -> derived confidence

The vision model reads the document. It does not decide the verdict.
"""

import asyncio
import hmac
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional

import dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

dotenv.load_dotenv()

from app.api.contract import ENGINE_VERSION, to_api_response
from app.classifier.document_classifier import DocumentClassifier
from app.groq.client import GroqClient
from app.models.schemas import AccountData, VisionExtraction
from app.verification.pipeline import verify_document_image
from app.vision.client import VisionClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("AIEngine")

app = FastAPI(title="ParkMitra AI Verification Engine", version=ENGINE_VERSION)

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

GROQ_VISION_MODELS = [
    model.strip()
    for model in os.getenv("GROQ_VISION_MODELS", "qwen/qwen3.6-27b").split(",")
    if model.strip()
]

REQUEST_TIMEOUT_S = float(os.getenv("AI_REQUEST_TIMEOUT_S", "25"))
# Kept under the Node client's abort so we return a partial answer rather than
# having the whole request killed with nothing to show.
TOTAL_BUDGET_S = float(os.getenv("AI_TOTAL_BUDGET_S", "75"))
MAX_WORKERS = int(os.getenv("AI_MAX_WORKERS", "3"))

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_FILES = 10

_warm_client: Optional[VisionClient] = None


@app.on_event("startup")
async def on_startup() -> None:
    global _warm_client
    logger.info(
        "Engine %s starting | vision models: %s | groq key: %s | shared secret: %s",
        ENGINE_VERSION,
        ", ".join(GROQ_VISION_MODELS) or "(none configured)",
        "set" if GROQ_API_KEY else "MISSING",
        "set" if AI_ENGINE_API_KEY else "NOT SET (engine is unauthenticated)",
    )
    if not AI_ENGINE_API_KEY:
        logger.warning(
            "AI_ENGINE_API_KEY is unset, so the X-API-Key check is a no-op and this "
            "port accepts document analysis from any local process."
        )
    _warm_client = VisionClient(
        api_key=GROQ_API_KEY, models=GROQ_VISION_MODELS, request_timeout_s=REQUEST_TIMEOUT_S
    )
    # Warm TLS/DNS so the first demo upload does not pay cold-start latency.
    await asyncio.get_event_loop().run_in_executor(None, _warm_client.warm_up)


@app.middleware("http")
async def require_api_key(request: Request, call_next):
    """Require a shared secret when AI_ENGINE_API_KEY is configured."""
    if AI_ENGINE_API_KEY and request.url.path != "/health":
        provided = request.headers.get("X-API-Key", "")
        if not provided or not hmac.compare_digest(provided, AI_ENGINE_API_KEY):
            raise HTTPException(status_code=401, detail="Invalid or missing API key.")
    return await call_next(request)


@app.get("/")
def read_root():
    return {
        "status": "ok",
        "service": "ParkMitra AI Verification Engine",
        "version": ENGINE_VERSION,
        "textModel": GROQ_MODEL,
        "visionModels": GROQ_VISION_MODELS,
    }


@app.get("/health")
def health():
    """
    Pre-flight check for demo day. Confirms the key works and reports which vision
    models this account can actually reach -- a wrong model id otherwise fails as
    a 404 that is easy to miss until you are on stage.
    """
    configured = bool(GROQ_API_KEY) and bool(GROQ_VISION_MODELS)
    reachable: List[str] = []
    error: Optional[str] = None

    if GROQ_API_KEY:
        try:
            from groq import Groq

            available = {m.id for m in Groq(api_key=GROQ_API_KEY).models.list().data}
            reachable = [m for m in GROQ_VISION_MODELS if m in available]
        except Exception as exc:
            error = f"{type(exc).__name__}: {exc}"

    ok = configured and bool(reachable) and error is None
    return {
        "ok": ok,
        "version": ENGINE_VERSION,
        "groqConfigured": bool(GROQ_API_KEY),
        "sharedSecretSet": bool(AI_ENGINE_API_KEY),
        "visionModelsConfigured": GROQ_VISION_MODELS,
        "visionModelsReachable": reachable,
        "lastCallOk": _warm_client.last_call_ok if _warm_client else None,
        "lastCallLatencyMs": _warm_client.last_call_latency_ms if _warm_client else None,
        "error": error,
    }


@app.post("/verify-documents")
async def verify_documents(
    files: List[UploadFile] = File(...),
    expectedRegistration: Optional[str] = Form(None),
    expectedName: Optional[str] = Form(None),
    expectedDob: Optional[str] = Form(None),
):
    if not files:
        raise HTTPException(status_code=400, detail="No document files provided")
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"At most {MAX_FILES} files per request.")

    payloads = []
    for index, upload in enumerate(files):
        content = await upload.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail="Uploaded file is too large. Maximum allowed size is 15MB.",
            )
        payloads.append((content, upload.filename or f"document_{index + 1}.jpg"))

    account = AccountData(
        name=expectedName or "",
        vehicle_registration_number=expectedRegistration or None,
        date_of_birth=expectedDob or None,
    )

    # One client per request: its content-hash cache dedupes repeated images
    # within the batch, and nothing survives across users.
    vision = VisionClient(
        api_key=GROQ_API_KEY, models=GROQ_VISION_MODELS, request_timeout_s=REQUEST_TIMEOUT_S
    )
    # Keyword/regex classifier only. The vision model has already classified the
    # document, so a second LLM round-trip per file would add latency and cost for
    # a signal that is *less* independent than the deterministic rules.
    classifier = DocumentClassifier(groq_client=GroqClient(api_key=""))
    started = time.monotonic()

    def run_one(item):
        content, filename = item
        if time.monotonic() - started > TOTAL_BUDGET_S:
            return verify_document_image(
                content=content, filename=filename, account=account, vision=vision,
                classifier=classifier,
                extraction=VisionExtraction(
                    ok=False,
                    failure_reason=(
                        "The engine ran out of time before reaching this document. "
                        "It was not checked."
                    ),
                ),
            )
        return verify_document_image(
            content=content, filename=filename, account=account,
            vision=vision, classifier=classifier,
        )

    # Sequential 5s calls across four documents is 20s of dead air on stage.
    # Capped at 3 to stay inside Groq's per-key rate limit.
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, len(payloads))) as pool:
        outcomes = await asyncio.gather(
            *[loop.run_in_executor(pool, run_one, item) for item in payloads]
        )

    response = to_api_response(list(outcomes))
    logger.info(
        "Verified %s document(s) in %sms -> %s (confidence %s)",
        len(payloads),
        int((time.monotonic() - started) * 1000),
        response["overallStatus"],
        response["overallConfidence"],
    )
    return response


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
