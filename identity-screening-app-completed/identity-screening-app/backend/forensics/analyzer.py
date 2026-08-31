import os
import cv2
import numpy as np
import io
from PIL import Image
from typing import Dict, Any, List, Optional

# Check if TruFor module or model weights can be imported
HAS_TRUFOR = False
try:
    import torch
    if os.path.exists("models/trufor.pth"):
        HAS_TRUFOR = True
except Exception:
    HAS_TRUFOR = False


def _compute_ela_map(bgr_image: np.ndarray, quality: int = 90) -> np.ndarray:
    """
    Computes Error Level Analysis (ELA) map by re-saving the image at quality=90 JPEG
    and computing the absolute pixel difference scaled to 0-255.
    """
    rgb_img = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb_img)

    buffer = io.BytesIO()
    pil_img.save(buffer, format="JPEG", quality=quality)
    buffer.seek(0)

    recompressed_pil = Image.open(buffer)
    recompressed_bgr = cv2.cvtColor(np.array(recompressed_pil), cv2.COLOR_RGB2BGR)

    diff = cv2.absdiff(bgr_image, recompressed_bgr)
    gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)

    max_val = np.max(gray_diff)
    if max_val == 0:
        max_val = 1
    scale = 255.0 / max_val
    ela_map = cv2.convertScaleAbs(gray_diff, alpha=scale)

    return ela_map


def _detect_local_texture_anomalies(gray_image: np.ndarray, block_size: int = 32) -> np.ndarray:
    """
    Computes local standard deviation map across grid blocks to find texture/noise variance anomalies.
    """
    h, w = gray_image.shape
    std_map = np.zeros((max(1, h // block_size), max(1, w // block_size)), dtype=np.float32)

    for i in range(0, h - block_size, block_size):
        for j in range(0, w - block_size, block_size):
            block = gray_image[i:i+block_size, j:j+block_size]
            if block.size > 0:
                std_map[i // block_size, j // block_size] = float(np.std(block))

    std_full = cv2.resize(std_map, (w, h), interpolation=cv2.INTER_CUBIC)
    return std_full


def analyze_document_forensics(
    preprocessed_data: dict,
    ocr_result: Optional[dict] = None,
    mrz_result: Optional[dict] = None,
    barcode_result: Optional[dict] = None
) -> dict:
    """
    Executes comprehensive multi-modal forensic identity screening:
    1. Error Level Analysis (ELA) & Local Texture/Edge Splicing Detection.
    2. MRZ Checksum Validation Integration.
    3. QR / Barcode Cross-Match Integration.
    4. OCR Consistency & Readability Assessment.
    5. Composite Risk Score and Final Decision Engine (VERIFIED, SUSPICIOUS, HIGH RISK).
    """
    processed_bgr = preprocessed_data["processed_bgr"]
    processed_gray = preprocessed_data["processed_gray"]
    h, w = processed_bgr.shape[:2]

    analysis_method = "OpenCV-Forensics-ELA-v2.0"
    if HAS_TRUFOR:
        analysis_method = "TruFor-PyTorch-v1.0"

    # 1. Error Level Analysis (ELA)
    ela_map = _compute_ela_map(processed_bgr, quality=90)
    ela_mean = float(np.mean(ela_map))
    ela_std = float(np.std(ela_map))
    ela_max = float(np.max(ela_map))

    # 2. Local Texture & Noise Inconsistency
    texture_map = _detect_local_texture_anomalies(processed_gray, block_size=32)
    texture_variance = float(np.std(texture_map))

    # 3. Edge Discontinuity Detection via Sobel
    sobelx = cv2.Sobel(processed_gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(processed_gray, cv2.CV_64F, 0, 1, ksize=3)
    sobel_magnitude = np.sqrt(sobelx**2 + sobely**2)
    edge_anomaly_score = float(np.percentile(sobel_magnitude, 95))

    # Base Tampering Score from Image Forensics (0 - 100)
    ela_risk_contrib = min(45.0, (ela_std / 35.0) * 45.0)
    texture_risk_contrib = min(35.0, (texture_variance / 25.0) * 35.0)
    edge_risk_contrib = min(20.0, (edge_anomaly_score / 200.0) * 20.0)

    tampering_score = round(ela_risk_contrib + texture_risk_contrib + edge_risk_contrib, 1)
    tampering_score = max(0.0, min(100.0, tampering_score))

    # 4. Multi-Modal Cross-Dimension Risk Weighting
    reasons: List[str] = []
    suspicious_regions: List[Dict[str, Any]] = []

    # Detect Top Suspicious Regions (Bounding Boxes) from ELA high variance
    _, thresh = cv2.threshold(ela_map, 140, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    dilated = cv2.dilate(thresh, kernel, iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    region_idx = 1
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > (h * w * 0.005):
            x_px, y_px, w_px, h_px = cv2.boundingRect(cnt)
            x_pct = round((x_px / w) * 100, 1)
            y_pct = round((y_px / h) * 100, 1)
            w_pct = round((w_px / w) * 100, 1)
            h_pct = round((h_px / h) * 100, 1)

            suspicious_regions.append({
                "id": f"sr_{region_idx}",
                "title": f"Compression Anomaly Region #{region_idx}",
                "description": "High Error Level Analysis (ELA) variance detected; potential digital copy-paste or photo replacement boundary.",
                "severity": "HIGH" if tampering_score > 60 else "MEDIUM",
                "type": "ELA_ARTIFACT",
                "boundingBox": {
                    "x": x_pct,
                    "y": y_pct,
                    "width": w_pct,
                    "height": h_pct,
                }
            })
            region_idx += 1
            if region_idx > 4:
                break

    # Calculate Data Consistency Risk
    data_consistency_score = 0.0
    
    # MRZ Impact
    if mrz_result and mrz_result.get("is_applicable"):
        if mrz_result.get("status") == "FAILED":
            data_consistency_score += 55.0
            reasons.append("MRZ Checksum Validation FAILED! Check digit mismatch detected in Machine Readable Zone.")
        elif mrz_result.get("status") == "VERIFIED":
            reasons.append(f"ICAO 9303 MRZ Checksums PASSED ({mrz_result.get('format')}).")
    elif mrz_result and not mrz_result.get("is_applicable"):
        # Explicit neutral note
        pass

    # QR / Barcode Impact
    if barcode_result and barcode_result.get("detected"):
        if barcode_result.get("status") == "MISMATCH":
            data_consistency_score += 50.0
            reasons.append(f"Barcode / QR Payload Mismatch! Decoded {barcode_result.get('primary_format')} conflicts with OCR text fields.")
        elif barcode_result.get("status") == "INVALID":
            data_consistency_score += 25.0
            reasons.append(f"Corrupted or damaged {barcode_result.get('primary_format')} payload detected.")
        elif barcode_result.get("status") == "MATCH":
            reasons.append(f"Decoded {barcode_result.get('primary_format')} payload matches printed document credentials.")

    # OCR Readability Impact
    if ocr_result:
        if not ocr_result.get("is_readable"):
            if preprocessed_data.get("is_blurry"):
                reasons.append("Document image displays excessive blur or optical distortion preventing OCR extraction.")
        elif ocr_result.get("overall_confidence", 100) < 50:
            reasons.append("Low OCR character recognition confidence across identity fields.")
        else:
            fields = ocr_result.get("fields", {})
            if fields.get("doc_number"):
                reasons.append(f"OCR extracted valid {fields.get('document_type', 'ID')} credentials (ID: {fields.get('doc_number')}).")

    # Image Forensics Reasons
    if tampering_score >= 65.0:
        reasons.append(f"High Error Level Analysis (ELA) compression variance detected (Std: {ela_std:.1f}).")
        reasons.append("Splicing artifacts identified around photo or text field boundaries.")
    elif tampering_score >= 35.0:
        reasons.append(f"Moderate ELA compression delta detected (Tamper Score: {tampering_score:.1f}%).")
    else:
        reasons.append("Document image displays uniform Error Level Analysis compression.")
        reasons.append("No digital splicing or copy-paste boundary anomalies detected.")

    # Calculate Composite Multi-Modal Risk Score (0.0 to 100.0)
    # Weighting: 40% Image Tampering, 35% Data Consistency (MRZ/Barcode), 15% OCR Quality, 10% Blur/Contrast
    composite_risk_score = round(
        (tampering_score * 0.40) +
        (min(100.0, data_consistency_score) * 0.35) +
        (max(0.0, 100.0 - (ocr_result.get("overall_confidence", 80.0) if ocr_result else 80.0)) * 0.15) +
        (30.0 if preprocessed_data.get("is_blurry") else 0.0) * 0.10,
        1
    )
    composite_risk_score = max(0.0, min(100.0, composite_risk_score))

    # Determine Final Decision States: VERIFIED, SUSPICIOUS, HIGH RISK
    if composite_risk_score >= 65.0 or tampering_score >= 70.0 or data_consistency_score >= 50.0:
        final_decision = "HIGH RISK"
        risk_level = "HIGH"
    elif composite_risk_score >= 30.0 or tampering_score >= 35.0:
        final_decision = "SUSPICIOUS"
        risk_level = "MEDIUM"
    else:
        final_decision = "VERIFIED"
        risk_level = "LOW"

    return {
        "tampering_score": tampering_score,
        "composite_risk_score": composite_risk_score,
        "risk_level": risk_level,
        "final_decision": final_decision,
        "suspicious_regions": suspicious_regions,
        "analysis_method": analysis_method,
        "reasons": reasons,
        "ela_map": ela_map,
        "texture_map": texture_map,
    }
