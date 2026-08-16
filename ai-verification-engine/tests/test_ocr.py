import io
from PIL import Image, ImageDraw, ImageFont
from app.ocr.preprocessing import preprocess_image_bytes, PreprocessingConfig
from app.ocr.service import OCRService


def test_image_preprocessing_bytes():
    # Create simple PIL test image in memory
    img = Image.new("RGB", (600, 400), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((50, 50), "TEST DRIVING LICENCE", fill=(0, 0, 0))

    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    raw_bytes = img_byte_arr.getvalue()

    processed_bytes = preprocess_image_bytes(raw_bytes, PreprocessingConfig())
    assert len(processed_bytes) > 0


def test_ocr_service_empty_input():
    ocr_service = OCRService()
    text = ocr_service.process_document(b"")
    assert text == ""
