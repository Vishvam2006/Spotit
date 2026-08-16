import io
import math
from typing import Tuple, Optional
from dataclasses import dataclass
import numpy as np
from PIL import Image
import cv2


@dataclass
class PreprocessingConfig:
    target_max_dim: int = 2048
    target_min_dim: int = 800
    enable_grayscale: bool = True
    enable_contrast_enhancement: bool = True
    enable_denoise: bool = True
    enable_deskew: bool = True


def preprocess_image_bytes(image_bytes: bytes, config: Optional[PreprocessingConfig] = None) -> bytes:

    if not image_bytes:
        return b""

    cfg = config or PreprocessingConfig()

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        try:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        except Exception:
            return image_bytes
    h, w = img.shape[:2]
    max_dim = max(h, w)
    min_dim = min(h, w)

    if max_dim > cfg.target_max_dim:
        scale = cfg.target_max_dim / float(max_dim)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    elif min_dim < cfg.target_min_dim and min_dim > 0:
        scale = cfg.target_min_dim / float(min_dim)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

    if cfg.enable_grayscale and len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()
    if cfg.enable_contrast_enhancement:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)

    if cfg.enable_denoise:
        gray = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)


    if cfg.enable_deskew:
        gray = _deskew(gray)

    success, encoded = cv2.imencode(".png", gray)
    if success:
        return encoded.tobytes()

    return image_bytes


def _deskew(gray_img: np.ndarray) -> np.ndarray:
 
    try:
        thresh = cv2.threshold(gray_img, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) < 50:
            return gray_img

        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        if abs(angle) < 0.5 or abs(angle) > 30:
            return gray_img

        (h, w) = gray_img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(gray_img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return rotated
    except Exception:
        return gray_img
