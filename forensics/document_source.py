import io
import re
import cv2
import numpy as np
from PIL import Image, ExifTags
from typing import Dict, Any, Tuple, Optional


def classify_document_source(
    image: np.ndarray,
    raw_bytes: bytes,
    filename: str = "",
    mime_type: str = ""
) -> Dict[str, Any]:
    """
    Classifies the input document source:
    - PHYSICAL_CAPTURE (Photos taken via smartphone/webcam/camera with physical lighting)
    - SCANNED_DOCUMENT (Flatbed scanner captures with uniform illumination)
    - DIGITAL_PDF (Official PDF downloads from UIDAI / Income Tax Dept / DigiLocker)
    - DIGITAL_IMAGE (Vector exports, digital e-cards with crisp rasterization)
    - SCREENSHOT (Mobile / Desktop screenshots with digital UI or screen aspect ratios)
    - UNKNOWN
    """
    filename_lower = filename.lower()
    h, w = image.shape[:2]

    # 1. PDF Check
    if filename_lower.endswith(".pdf") or raw_bytes.startswith(b"%PDF-") or "pdf" in mime_type.lower():
        return {
            "source_type": "DIGITAL_PDF",
            "display_name": "Digital PDF Document",
            "is_digital": True,
            "is_physical": False,
            "camera_glare_applicable": False,
            "camera_blur_applicable": False,
            "perspective_skew_applicable": False,
            "ela_physical_flash_applicable": False,
            "confidence": 1.0,
            "details": "Vector PDF with digital typography and machine-readable structures."
        }

    # 2. Inspect EXIF Metadata
    exif_data = {}
    software_tag = ""
    make_tag = ""
    model_tag = ""
    has_camera_exif = False

    try:
        pil_img = Image.open(io.BytesIO(raw_bytes))
        raw_exif = pil_img._getexif()
        if raw_exif:
            for tag_id, val in raw_exif.items():
                tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                exif_data[tag_name] = str(val)
            
            make_tag = exif_data.get("Make", "").lower()
            model_tag = exif_data.get("Model", "").lower()
            software_tag = exif_data.get("Software", "").lower()

            if make_tag or model_tag or "FocalLength" in exif_data or "ISOSpeedRatings" in exif_data:
                has_camera_exif = True
    except Exception:
        pass

    # 3. Filename & Metadata Screenshot Indicators
    is_screenshot_named = any(kw in filename_lower for kw in ["screenshot", "screen_shot", "screen shot", "screencap", "capture_"])
    is_screenshot_software = any(kw in software_tag for kw in ["screenshot", "screen", "capture"])

    # 4. Pixel Distribution & Digital Flatness Analysis
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

    # Measure proportion of pure solid white / near-white background
    pure_white_mask = (gray >= 250)
    pure_white_ratio = float(np.sum(pure_white_mask) / max(1, h * w))

    # Noise floor measurement in homogeneous regions (Sensor grain vs Digital 0-variance)
    # Physical cameras ALWAYS have sensor noise (std > 2.5) even on clean white paper.
    # Digital vector/screenshot white backgrounds have std < 0.6.
    white_pixels = gray[pure_white_mask]
    white_std = float(np.std(white_pixels)) if len(white_pixels) > 1000 else 5.0

    # Color histogram peakiness (Digital graphics have very few quantized discrete colors)
    if len(image.shape) == 3:
        # Sample small center patch to test color quantization
        small_patch = image[::4, ::4]
        flat_patch = small_patch.reshape(-1, 3)
        unique_colors = len(np.unique(flat_patch, axis=0))
        color_sparsity = unique_colors / max(1, flat_patch.shape[0])
    else:
        color_sparsity = 0.5

    # Screen Aspect Ratio Check (Mobile: 9:16 to 9:21; Desktop: 16:9, 16:10)
    aspect_ratio = max(w, h) / max(1, min(w, h))
    is_common_screen_ratio = (
        (1.75 <= aspect_ratio <= 2.25) or  # Modern mobile phones (19.5:9, 20:9, 18:9)
        (1.58 <= aspect_ratio <= 1.80) or  # 16:9 desktop/mobile
        (1.30 <= aspect_ratio <= 1.36)     # 4:3 tablets
    )

    # Sharp step edge gradient (Digital text has 1-pixel transitions; camera has PSF blur)
    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    edge_gradient = np.sqrt(sobel_x**2 + sobel_y**2)
    p99_gradient = float(np.percentile(edge_gradient, 99))

    # 5. Authoritative Classification Logic

    # A. Digital Screenshot
    if is_screenshot_named or is_screenshot_software or (is_common_screen_ratio and pure_white_ratio > 0.30 and white_std < 1.2 and not has_camera_exif):
        return {
            "source_type": "SCREENSHOT",
            "display_name": "Digital Screen Capture",
            "is_digital": True,
            "is_physical": False,
            "camera_glare_applicable": False,
            "camera_blur_applicable": False,
            "perspective_skew_applicable": False,
            "ela_physical_flash_applicable": False,
            "confidence": 0.95,
            "details": "Screen capture of digital identity credential with direct pixel rendering."
        }

    # B. Digital Image / E-Document Export (e-Aadhaar / e-PAN digital render)
    if (pure_white_ratio > 0.35 and white_std < 1.5 and not has_camera_exif) or (color_sparsity < 0.08 and p99_gradient > 1200):
        return {
            "source_type": "DIGITAL_IMAGE",
            "display_name": "Digital E-Document Export",
            "is_digital": True,
            "is_physical": False,
            "camera_glare_applicable": False,
            "camera_blur_applicable": False,
            "perspective_skew_applicable": False,
            "ela_physical_flash_applicable": False,
            "confidence": 0.92,
            "details": "Digitally generated document graphic with uniform paper background."
        }

    # C. Scanned Document
    is_scanner_software = any(kw in software_tag for kw in ["scan", "epson", "canon", "hp", "brother", "camscanner", "scanner"])
    if is_scanner_software or (pure_white_ratio > 0.40 and white_std < 3.5 and not has_camera_exif and not is_common_screen_ratio):
        return {
            "source_type": "SCANNED_DOCUMENT",
            "display_name": "Flatbed Scanned Document",
            "is_digital": False,
            "is_physical": True,
            "camera_glare_applicable": False,  # Scanners don't have camera flash glare!
            "camera_blur_applicable": True,
            "perspective_skew_applicable": True,
            "ela_physical_flash_applicable": False,
            "confidence": 0.88,
            "details": "High-resolution flatbed scan with uniform linear illumination."
        }

    # D. Physical Camera Capture
    return {
        "source_type": "PHYSICAL_CAPTURE",
        "display_name": "Physical Camera Capture",
        "is_digital": False,
        "is_physical": True,
        "camera_glare_applicable": True,
        "camera_blur_applicable": True,
        "perspective_skew_applicable": True,
        "ela_physical_flash_applicable": True,
        "confidence": 0.90 if has_camera_exif else 0.75,
        "details": "Optical camera photograph of physical identity document."
    }
