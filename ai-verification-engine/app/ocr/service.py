import io
import os
import tempfile
from abc import ABC, abstractmethod
from typing import Optional, Union, List
from PIL import Image
import pypdf

from .preprocessing import preprocess_image_bytes, PreprocessingConfig


class BaseOCREngine(ABC):
    @abstractmethod
    def extract_text_from_bytes(self, content_bytes: bytes, file_type: str) -> str:
        pass


class PDFOCREngine(BaseOCREngine):
    def extract_text_from_bytes(self, content_bytes: bytes, file_type: str) -> str:
        if not content_bytes:
            return ""

        extracted_text_pages: List[str] = []

        try:
            pdf_file = io.BytesIO(content_bytes)
            reader = pypdf.PdfReader(pdf_file)

            for page in reader.pages:
                page_text = page.extract_text() or ""
                if page_text.strip():
                    extracted_text_pages.append(page_text)

            return "\n".join(extracted_text_pages)
        except Exception:
            return ""


class ModularImageOCREngine(BaseOCREngine):

    def extract_text_from_bytes(self, content_bytes: bytes, file_type: str) -> str:
        if not content_bytes:
            return ""
        try:
            preprocessed = preprocess_image_bytes(content_bytes)
        except Exception:
            preprocessed = content_bytes

        if not preprocessed:
            preprocessed = content_bytes

        try:
            import pytesseract
            pil_img = Image.open(io.BytesIO(preprocessed))
            text = pytesseract.image_to_string(pil_img)
            if text and text.strip():
                return text.strip()
        except Exception:
            pass

        try:
            import easyocr
            reader = easyocr.Reader(['en'], gpu=False)
            results = reader.readtext(preprocessed, detail=0)
            if results:
                return "\n".join(results)
        except Exception:
            pass

        return ""


class OCRService:

    def __init__(self, custom_engine: Optional[BaseOCREngine] = None):
        self.pdf_engine = PDFOCREngine()
        self.image_engine = custom_engine or ModularImageOCREngine()

    def process_document(
        self,
        document: Union[bytes, str],
        filename: Optional[str] = None
    ) -> str:
        content_bytes: bytes = b""
        file_ext = "jpg"

        if isinstance(document, str):
            if "." in document:
                file_ext = document.rsplit(".", 1)[-1].lower()
            if os.path.exists(document):
                try:
                    with open(document, "rb") as f:
                        content_bytes = f.read()
                except Exception:
                    return ""
        elif isinstance(document, bytes):
            content_bytes = document
            if filename and "." in filename:
                file_ext = filename.rsplit(".", 1)[-1].lower()

        if not content_bytes:
            return ""
        is_pdf = content_bytes.startswith(b"%PDF") or file_ext in ["pdf"]

        if is_pdf:
            raw_text = self.pdf_engine.extract_text_from_bytes(content_bytes, "pdf")
            if not raw_text.strip():
                raw_text = self._fallback_scanned_pdf(content_bytes)
            return raw_text
        else:
            return self.image_engine.extract_text_from_bytes(content_bytes, file_ext)

    def _fallback_scanned_pdf(self, content_bytes: bytes) -> str:
        temp_file_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp.write(content_bytes)
                temp_file_path = tmp.name

            reader = pypdf.PdfReader(temp_file_path)
            all_extracted: List[str] = []
            for page in reader.pages:
                if hasattr(page, "images"):
                    for img_obj in page.images:
                        img_bytes = getattr(img_obj, "data", None)
                        if img_bytes:
                            txt = self.image_engine.extract_text_from_bytes(img_bytes, "png")
                            if txt.strip():
                                all_extracted.append(txt)

            return "\n".join(all_extracted)
        except Exception:
            return ""
        finally:
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except Exception:
                    pass
