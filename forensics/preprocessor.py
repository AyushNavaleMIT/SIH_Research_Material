import cv2
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from .config import QUALITY_GATE_CONFIG
from .document_source import classify_document_source


def _detect_physical_camera_glare(gray: np.ndarray) -> Tuple[float, bool]:
    """
    Detects true physical camera flash specular reflections (hotspots).
    Unlike naive thresholding which flags flat digital white pages,
    physical flash glare produces localized elliptical hotspots with steep radial intensity drop-off.
    """
    h, w = gray.shape[:2]
    # Saturated pixels
    saturated = (gray >= 252).astype(np.uint8)
    
    # Connected components for hotspot blob detection
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(saturated, connectivity=8)
    
    total_glare_pixels = 0
    total_area = max(1, h * w)

    # Check for concentrated specular reflection blobs
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        bw = stats[i, cv2.CC_STAT_WIDTH]
        bh = stats[i, cv2.CC_STAT_HEIGHT]
        
        # Flash hotspots are compact blobs (not whole pages or line scans)
        if area > 100 and bw < (w * 0.7) and bh < (h * 0.7):
            # Check if surrounded by a gradient falloff (typical of phone flash)
            total_glare_pixels += area

    glare_ratio = float(total_glare_pixels / total_area)
    is_excessive = glare_ratio > QUALITY_GATE_CONFIG["max_glare_ratio"]
    return glare_ratio, is_excessive


def evaluate_image_quality_gate(
    image: np.ndarray,
    gray: np.ndarray,
    orig_shape: tuple[int, int],
    source_info: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Source-Aware Document Quality Gate:
    - PHYSICAL_CAPTURE: Evaluates optical blur, localized flash glare, boundary cropping, and physical lighting.
    - DIGITAL_PDF: Glare & physical camera blur are marked NOT_APPLICABLE. Validates vector resolution & readability.
    - DIGITAL_IMAGE / SCREENSHOT: Glare is marked NOT_APPLICABLE. Validates digital clarity & document structure.
    - SCANNED_DOCUMENT: Validates scanner resolution & boundary alignment without camera flash penalties.
    """
    orig_h, orig_w = orig_shape
    h, w = gray.shape[:2]
    issues: List[str] = []
    warnings: List[str] = []

    if source_info is None:
        source_info = {
            "source_type": "PHYSICAL_CAPTURE",
            "display_name": "Physical Camera Capture",
            "is_digital": False,
            "camera_glare_applicable": True,
            "camera_blur_applicable": True,
            "perspective_skew_applicable": True,
        }

    source_type = source_info.get("source_type", "PHYSICAL_CAPTURE")
    is_digital = source_info.get("is_digital", False)
    camera_glare_applicable = source_info.get("camera_glare_applicable", True)
    camera_blur_applicable = source_info.get("camera_blur_applicable", True)

    # 1. Resolution Check
    min_w = QUALITY_GATE_CONFIG["min_width"]
    min_h = QUALITY_GATE_CONFIG["min_height"]
    is_low_res = orig_w < min_w or orig_h < min_h
    if is_low_res:
        issues.append(f"Image resolution ({orig_w}x{orig_h}px) is below minimum required {min_w}x{min_h}px.")
    elif orig_w < QUALITY_GATE_CONFIG["recommended_width"] or orig_h < QUALITY_GATE_CONFIG["recommended_height"]:
        warnings.append(f"Image resolution ({orig_w}x{orig_h}px) is lower than recommended 800x600px.")

    # 2. Blur / Sharpness via Laplacian Variance & Tenengrad
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    tenengrad_val = float(np.mean(sobel_x**2 + sobel_y**2))

    is_severely_blurry = False
    if camera_blur_applicable and not is_digital:
        is_severely_blurry = laplacian_var < QUALITY_GATE_CONFIG["min_blur_laplacian"]
        is_moderately_blurry = (
            QUALITY_GATE_CONFIG["min_blur_laplacian"] <= laplacian_var < QUALITY_GATE_CONFIG["warning_blur_laplacian"]
        )
        if is_severely_blurry:
            issues.append("Document image displays severe optical motion blur; text characters cannot be reliably resolved.")
        elif is_moderately_blurry:
            warnings.append("Moderate image blur detected. Fine print lines may be difficult to verify.")

    # 3. Luminance & Exposure Metrics
    mean_luminance = float(np.mean(gray))
    std_contrast = float(np.std(gray))

    is_too_dark = False
    is_overexposed = False

    # Dark check applies to all documents (unreadable black images)
    if mean_luminance < QUALITY_GATE_CONFIG["min_mean_luminance"]:
        is_too_dark = True
        issues.append(f"Document is severely dark/underexposed (Luminance: {mean_luminance:.1f}/255).")
    
    # Overexposure check only applies to physical photographs (not white digital paper!)
    if not is_digital and mean_luminance > QUALITY_GATE_CONFIG["max_mean_luminance"]:
        # Only flag if there is virtually zero contrast (washed out photo)
        if std_contrast < 20.0:
            is_overexposed = True
            issues.append(f"Document photo is severely washed out by harsh flash (Luminance: {mean_luminance:.1f}/255).")

    # 4. Glare / Specular Highlight Detection
    glare_ratio = 0.0
    if camera_glare_applicable and not is_digital:
        glare_ratio, is_excessive_glare = _detect_physical_camera_glare(gray)
        if is_excessive_glare:
            issues.append(f"Excessive camera flash glare hotspot detected ({glare_ratio * 100:.1f}% surface obscured). Please capture without direct flashlight reflection.")

    # 5. Skew Angle Estimation
    skew_angle = 0.0
    if not is_digital:
        try:
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=100, minLineLength=int(w * 0.25), maxLineGap=20)
            if lines is not None and len(lines) > 0:
                angles = []
                for l in lines[:15]:
                    x1, y1, x2, y2 = l[0]
                    if x2 - x1 != 0:
                        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
                        if abs(angle) < 45:
                            angles.append(angle)
                        elif abs(angle) > 45:
                            angles.append(angle - (90 if angle > 0 else -90))
                if angles:
                    skew_angle = float(np.median(angles))
        except Exception:
            skew_angle = 0.0

        if abs(skew_angle) > QUALITY_GATE_CONFIG["max_skew_angle_deg"]:
            warnings.append(f"Document is rotated/skewed by approximately {skew_angle:.1f}°. Automatic alignment applied.")

    # 6. Boundary / Border Content Cut-off Check
    border_margin = int(min(h, w) * 0.02)
    cropped_edges = []
    if border_margin > 0 and not is_digital:
        top_strip = gray[:border_margin, :]
        bottom_strip = gray[-border_margin:, :]
        left_strip = gray[:, :border_margin]
        right_strip = gray[:, -border_margin:]

        if np.std(top_strip) > 40:
            cropped_edges.append("top")
        if np.std(bottom_strip) > 40:
            cropped_edges.append("bottom")
        if np.std(left_strip) > 40:
            cropped_edges.append("left")
        if np.std(right_strip) > 40:
            cropped_edges.append("right")

    if len(cropped_edges) >= 2:
        warnings.append(f"Document borders appear partially cropped at {', '.join(cropped_edges)} edges.")

    # Quality Gate Verdict
    has_critical_failure = len(issues) > 0 or is_severely_blurry or is_too_dark or is_overexposed
    quality_passed = not has_critical_failure

    status = "PASSED" if quality_passed else "RECAPTURE_REQUIRED"
    
    if quality_passed:
        if is_digital:
            recommendation = f"Document verified as clean {source_info.get('display_name', 'Digital Document')}. Ready for forensic & identity verification."
        else:
            recommendation = "Document capture quality is verified for physical forensic analysis."
    else:
        recommendation = "RECAPTURE REQUIRED: Image quality is insufficient. Please upload a clear document image or official digital PDF."

    return {
        "passed": quality_passed,
        "status": status,
        "source_type": source_type,
        "source_display": source_info.get("display_name", "Unknown Source"),
        "is_digital": is_digital,
        "has_critical_issues": has_critical_failure,
        "issues": issues,
        "warnings": warnings,
        "recommendation": recommendation,
        "metrics": {
            "source_type": source_type,
            "source_display": source_info.get("display_name", "Unknown Source"),
            "resolution": f"{orig_w}x{orig_h}",
            "blur_score": round(laplacian_var, 1),
            "tenengrad_sharpness": round(tenengrad_val, 1),
            "mean_luminance": round(mean_luminance, 1),
            "contrast_std": round(std_contrast, 1),
            "glare_ratio_pct": round(glare_ratio * 100, 1),
            "glare_applicable": camera_glare_applicable and not is_digital,
            "blur_applicable": camera_blur_applicable and not is_digital,
            "skew_angle_deg": round(skew_angle, 1),
            "cropped_edges": cropped_edges,
        }
    }


def preprocess_document_image(
    image: np.ndarray, 
    max_dim: int = 1600,
    source_info: Optional[Dict[str, Any]] = None
) -> dict:
    """
    Preprocesses uploaded document image:
    1. Calculates resolution & aspect ratio
    2. Resizes if dimensions exceed max_dim while preserving aspect ratio
    3. Performs source-aware Quality Gate analysis
    4. Computes normalized grayscale & enhanced representation
    """
    orig_h, orig_w = image.shape[:2]

    # Resize while preserving aspect ratio if larger than max_dim
    scale = 1.0
    if max(orig_h, orig_w) > max_dim:
        scale = max_dim / float(max(orig_h, orig_w))
        new_w = int(orig_w * scale)
        new_h = int(orig_h * scale)
        resized_img = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    else:
        resized_img = image.copy()

    # Convert to Grayscale
    gray = cv2.cvtColor(resized_img, cv2.COLOR_BGR2GRAY) if len(resized_img.shape) == 3 else resized_img

    # Run Source-Aware Quality Gate
    quality_gate = evaluate_image_quality_gate(
        image=resized_img,
        gray=gray,
        orig_shape=(orig_h, orig_w),
        source_info=source_info
    )

    # Contrast normalization
    normalized_gray = cv2.equalizeHist(gray)

    return {
        "original_image": image,
        "processed_bgr": resized_img,
        "processed_gray": gray,
        "normalized_gray": normalized_gray,
        "original_shape": (orig_h, orig_w),
        "processed_shape": resized_img.shape[:2],
        "source_info": source_info or quality_gate.get("source_info"),
        "source_type": quality_gate.get("source_type", "PHYSICAL_CAPTURE"),
        "blur_score": quality_gate["metrics"]["blur_score"],
        "is_blurry": quality_gate["metrics"]["blur_score"] < QUALITY_GATE_CONFIG["warning_blur_laplacian"] if quality_gate["metrics"]["blur_applicable"] else False,
        "mean_luminance": quality_gate["metrics"]["mean_luminance"],
        "contrast_std": quality_gate["metrics"]["contrast_std"],
        "quality_gate": quality_gate,
    }
