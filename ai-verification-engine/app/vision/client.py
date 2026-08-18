"""
The single hardened Groq vision call.

Everything the demo shows comes from a real API call -- there is no mock mode and
no canned result. What this module adds is the hardening that keeps a live call
from turning into dead air: explicit timeouts, bounded retries on transient
errors only, an ordered model fallback list, structured JSON mode, and a
content-hash cache so the same image is never sent twice within one request.
"""

import base64
import hashlib
import json
import logging
import os
import random
import re
import time
from typing import List, Optional

from app.models.schemas import VisionExtraction
from app.vision.prompt import VISION_SYSTEM_PROMPT, build_vision_user_prompt
from app.vision.sanitize import sanitize_transcription

logger = logging.getLogger("VisionClient")

VALID_DOCUMENT_KINDS = {
    "VEHICLE_RC",
    "DRIVING_LICENSE",
    "OTHER_DOCUMENT",
    "NOT_A_DOCUMENT",
}

# Retry only what a retry can actually fix. A 400 (bad image) or 401 (bad key)
# will not improve on a second attempt.
RETRYABLE_STATUS = {408, 409, 429, 500, 502, 503, 504}

# Reasoning vision models spend a large share of the budget on a <think> block
# before the JSON. At 3000 a dense RC truncated mid-answer (finish_reason
# "length") and no JSON ever arrived, so the document went unverified.
MAX_COMPLETION_TOKENS = int(os.getenv("AI_MAX_COMPLETION_TOKENS", "4000"))

# Phone photos of documents are routinely 4-12MB. Base64 inflates them by a third
# and the API rejects oversized requests with a 413, so every upload is downscaled
# before it is sent. 1600px on the long edge is comfortably enough to read printed
# text on an RC or licence, and it cuts several seconds off each call.
MAX_IMAGE_EDGE_PX = int(os.getenv("AI_MAX_IMAGE_EDGE_PX", "1600"))
MAX_IMAGE_BYTES = int(os.getenv("AI_MAX_IMAGE_BYTES", str(1_500_000)))


def detect_mime_type(content: bytes) -> str:
    """Sniffs the upload's real type; the vision API rejects a wrong data: prefix."""
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    if content.startswith(b"%PDF-"):
        return "application/pdf"
    return "image/jpeg"


def prepare_image(content: bytes, mime_type: str) -> tuple[bytes, str]:
    """
    Downscale and re-encode so the request stays inside the API's size limit.
    Returns the original bytes unchanged if Pillow is unavailable or the image is
    already small -- never fails the verification over a resize.
    """
    if mime_type == "application/pdf":
        return content, mime_type
    if len(content) <= MAX_IMAGE_BYTES:
        return content, mime_type

    try:
        import io

        from PIL import Image

        image = Image.open(io.BytesIO(content))
        image = image.convert("RGB")
        longest = max(image.size)
        if longest > MAX_IMAGE_EDGE_PX:
            scale = MAX_IMAGE_EDGE_PX / longest
            image = image.resize(
                (max(1, int(image.width * scale)), max(1, int(image.height * scale))),
                Image.LANCZOS,
            )

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=85, optimize=True)
        resized = buffer.getvalue()
        logger.info(
            "Downscaled document for vision call: %s -> %s bytes", len(content), len(resized)
        )
        return resized, "image/jpeg"
    except Exception as exc:
        logger.warning("Image downscale failed (%s); sending original", type(exc).__name__)
        return content, mime_type


def extract_json_object(text: Optional[str]) -> Optional[dict]:
    """
    Pulls the JSON object out of a model reply.

    Reasoning-capable vision models wrap the answer in prose that can itself
    contain braces, so a greedy first-brace-to-last-brace match is unreliable.
    This scans for the first brace-balanced object that parses, ignoring braces
    inside strings. Retained as a fallback for models that ignore response_format.
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


def _status_code_of(error: Exception) -> Optional[int]:
    for attr in ("status_code", "http_status"):
        code = getattr(error, attr, None)
        if isinstance(code, int):
            return code
    response = getattr(error, "response", None)
    code = getattr(response, "status_code", None)
    return code if isinstance(code, int) else None


def _is_json_mode_rejection(error: Exception) -> bool:
    """
    Groq validates JSON server-side when response_format is set. Reasoning models
    emit a <think> block before the answer, which fails that validation with a
    400 json_validate_failed -- the request is fine, the strict mode is not.
    """
    if _status_code_of(error) != 400:
        return False
    return "json_validate_failed" in str(error) or "Failed to validate JSON" in str(error)


def _is_retryable(error: Exception) -> bool:
    code = _status_code_of(error)
    if code is not None:
        return code in RETRYABLE_STATUS
    # No status code usually means a connection/timeout error, which is worth retrying.
    name = type(error).__name__.lower()
    return "connection" in name or "timeout" in name


class VisionClient:
    def __init__(
        self,
        api_key: str = "",
        models: Optional[List[str]] = None,
        request_timeout_s: float = 25.0,
        max_attempts_per_model: int = 2,
    ):
        self.api_key = api_key or os.getenv("GROQ_API_KEY", "")
        self.models = models or [
            m.strip()
            for m in os.getenv("GROQ_VISION_MODELS", "qwen/qwen3.6-27b").split(",")
            if m.strip()
        ]
        self.request_timeout_s = request_timeout_s
        self.max_attempts_per_model = max_attempts_per_model
        # Per-instance, and main.py builds one per request, so nothing survives
        # across users. This exists so the OCR adapter and the pipeline can both
        # ask for the same document without paying for two round-trips.
        self._cache: dict = {}
        self._client = None
        self.last_call_ok: Optional[bool] = None
        self.last_call_latency_ms: Optional[int] = None

    def is_configured(self) -> bool:
        return bool(self.api_key) and bool(self.models)

    def _get_client(self):
        if self._client is not None:
            return self._client
        if not self.api_key:
            return None
        try:
            from groq import Groq

            self._client = Groq(api_key=self.api_key)
        except Exception as exc:
            logger.error("Groq client init failed: %s", type(exc).__name__)
            self._client = None
        return self._client

    def warm_up(self) -> bool:
        """
        One-token text ping so TLS/DNS are warm before the first real request.
        Cheap insurance against the first demo upload paying cold-start latency.
        """
        client = self._get_client()
        if client is None or not self.models:
            return False
        try:
            # Warm the vision model we will actually call. Warming a different
            # text model proves nothing and 404s if that model is not on the
            # account, which is exactly what happened with llama-3.3-70b.
            client.chat.completions.create(
                model=self.models[0],
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
                temperature=0.0,
                timeout=10.0,
            )
            logger.info("Vision client warm-up succeeded")
            return True
        except Exception as exc:
            logger.warning("Vision client warm-up failed: %s", type(exc).__name__)
            return False

    def extract(self, image_bytes: bytes, mime_type: str) -> VisionExtraction:
        digest = hashlib.sha256(image_bytes).hexdigest()
        if digest in self._cache:
            return self._cache[digest]

        result = self._extract_uncached(image_bytes, mime_type)
        self._cache[digest] = result
        return result

    def _extract_uncached(self, image_bytes: bytes, mime_type: str) -> VisionExtraction:
        started = time.monotonic()

        client = self._get_client()
        if client is None:
            return VisionExtraction(
                ok=False,
                failure_reason="AI document analysis is not configured (GROQ_API_KEY is missing).",
            )
        if not self.models:
            return VisionExtraction(
                ok=False,
                failure_reason="No vision model is configured (GROQ_VISION_MODELS is empty).",
            )

        prepared, prepared_mime = prepare_image(image_bytes, mime_type)
        base64_image = base64.b64encode(prepared).decode("utf-8")
        data_url = f"data:{prepared_mime};base64,{base64_image}"
        attempts = 0
        last_error = "the vision model did not return a usable reply"

        for model in self.models:
            # Start strict, fall back to free-form + brace-scanning if this model
            # rejects JSON mode. Reasoning models need the loose path.
            json_mode = True
            attempt = 0
            while attempt < self.max_attempts_per_model:
                attempt += 1
                attempts += 1
                try:
                    extra = {"response_format": {"type": "json_object"}} if json_mode else {}
                    response = client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": VISION_SYSTEM_PROMPT},
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": build_vision_user_prompt()},
                                    {"type": "image_url", "image_url": {"url": data_url}},
                                ],
                            },
                        ],
                        temperature=0.0,
                        max_tokens=MAX_COMPLETION_TOKENS,
                        timeout=self.request_timeout_s,
                        **extra,
                    )
                    choice = response.choices[0]
                    parsed = extract_json_object(choice.message.content)
                    if parsed is None and choice.finish_reason == "length":
                        last_error = (
                            "the vision model's reply was cut off before it finished"
                        )
                        logger.warning(
                            "Vision reply truncated at max_tokens: model=%s attempt=%s",
                            model,
                            attempt,
                        )
                        continue

                    # A reply missing document_kind is a failed attempt, not an
                    # invalid document. Defaulting it would blame the user's photo
                    # for our parsing problem.
                    if parsed is None or not parsed.get("document_kind"):
                        last_error = "the vision model returned an unparseable reply"
                        logger.warning(
                            "Vision reply unusable: model=%s attempt=%s", model, attempt
                        )
                        continue

                    kind = str(parsed.get("document_kind", "")).upper().strip()
                    if kind not in VALID_DOCUMENT_KINDS:
                        kind = "OTHER_DOCUMENT"

                    latency_ms = int((time.monotonic() - started) * 1000)
                    self.last_call_ok = True
                    self.last_call_latency_ms = latency_ms

                    try:
                        readable = int(parsed.get("readable_field_count") or 0)
                    except (TypeError, ValueError):
                        readable = 0

                    return VisionExtraction(
                        ok=True,
                        document_kind=kind,
                        fields=parsed,
                        transcription=sanitize_transcription(parsed.get("transcription")),
                        legibility=str(parsed.get("legibility", "PARTIAL")).upper().strip(),
                        readable_field_count=max(0, min(readable, 6)),
                        model_used=model,
                        attempts=attempts,
                        latency_ms=latency_ms,
                    )

                except Exception as exc:
                    if _is_json_mode_rejection(exc) and json_mode:
                        # Not a real failure: retry this same model free-form and
                        # let the brace-balanced scanner pull the JSON out.
                        logger.info(
                            "Model %s rejected JSON mode; retrying without it", model
                        )
                        json_mode = False
                        attempt -= 1  # this attempt does not count against the budget
                        continue

                    code = _status_code_of(exc)
                    logger.warning(
                        "Vision call failed: model=%s attempt=%s error=%s status=%s",
                        model,
                        attempt,
                        type(exc).__name__,
                        code,
                    )
                    last_error = f"{type(exc).__name__}"
                    if not _is_retryable(exc):
                        break  # move to the next model rather than retrying
                    if attempt < self.max_attempts_per_model:
                        time.sleep(min(2 ** attempt * 0.4, 3.0) + random.uniform(0, 0.3))

        latency_ms = int((time.monotonic() - started) * 1000)
        self.last_call_ok = False
        self.last_call_latency_ms = latency_ms
        return VisionExtraction(
            ok=False,
            attempts=attempts,
            latency_ms=latency_ms,
            failure_reason=(
                f"The AI vision service could not be reached ({last_error}). "
                "The document was not checked."
            ),
        )
