import re
import cv2
import numpy as np
from typing import Dict, Any, List, Optional
import zxingcpp


def detect_and_verify_barcodes(
    bgr_image: np.ndarray,
    ocr_fields: Optional[Dict[str, Any]] = None,
    preprocessed_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Detects and decodes QR codes, PDF417, DataMatrix, Aztec, and 1D barcodes from document images.
    Cross-verifies decoded payload against OCR extracted fields.
    Returns structured results with MATCH, MISMATCH, INVALID, or NOT_FOUND status.
    """
    h, w = bgr_image.shape[:2]
    decoded_barcodes: List[Dict[str, Any]] = []
    seen_texts = set()

    # Strategy 1: zxingcpp on original BGR image
    try:
        results = zxingcpp.read_barcodes(bgr_image)
        for r in results:
            text = r.text.strip()
            if text and text not in seen_texts:
                seen_texts.add(text)
                format_name = str(r.format).replace("BarcodeFormat.", "")
                decoded_barcodes.append({
                    "format": format_name,
                    "raw_text": text,
                    "is_valid": r.is_valid,
                    "position": {
                        "top_left": [float(r.position.top_left.x), float(r.position.top_left.y)],
                        "bottom_right": [float(r.position.bottom_right.x), float(r.position.bottom_right.y)],
                    } if hasattr(r, 'position') else None
                })
    except Exception:
        pass

    # Strategy 2: OpenCV QRCodeDetector fallback if no QR found yet
    if not any(b["format"] in ["QRCode", "MicroQRCode"] for b in decoded_barcodes):
        try:
            qr_detector = cv2.QRCodeDetector()
            val, pts, _ = qr_detector.detectAndDecode(bgr_image)
            if val and val.strip() and val.strip() not in seen_texts:
                seen_texts.add(val.strip())
                decoded_barcodes.append({
                    "format": "QRCode",
                    "raw_text": val.strip(),
                    "is_valid": True,
                    "position": None
                })
        except Exception:
            pass

    # Strategy 3: Try inverted / enhanced grayscale if no barcodes found
    if not decoded_barcodes and preprocessed_data is not None:
        try:
            gray = preprocessed_data.get("processed_gray")
            if gray is not None:
                # Contrast enhanced
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                enhanced = clahe.apply(gray)
                results = zxingcpp.read_barcodes(enhanced)
                for r in results:
                    text = r.text.strip()
                    if text and text not in seen_texts:
                        seen_texts.add(text)
                        decoded_barcodes.append({
                            "format": str(r.format).replace("BarcodeFormat.", ""),
                            "raw_text": text,
                            "is_valid": r.is_valid,
                            "position": None
                        })
        except Exception:
            pass

    # If NO barcodes found
    if not decoded_barcodes:
        return {
            "detected": False,
            "status": "NOT_FOUND",
            "count": 0,
            "barcodes": [],
            "comparison_results": [],
            "status_detail": "No QR Code or 1D/2D Barcode detected on the document surface.",
            "is_genuine_proof_warning": "Decoding a barcode only verifies data encoding; physical security features still apply.",
            "payload_summary": None,
        }

    # If barcodes are detected, parse payload & cross-check with OCR fields
    primary_barcode = decoded_barcodes[0]
    payload = primary_barcode["raw_text"]
    format_name = primary_barcode["format"]

    # Check validity
    if not primary_barcode.get("is_valid", True):
        return {
            "detected": True,
            "status": "INVALID",
            "count": len(decoded_barcodes),
            "barcodes": decoded_barcodes,
            "comparison_results": [],
            "status_detail": f"Damaged or corrupted {format_name} payload detected. Checksum verification failed.",
            "is_genuine_proof_warning": "Decoding a barcode only verifies data encoding; physical security features still apply.",
            "payload_summary": payload[:100] + ("..." if len(payload) > 100 else "")
        }

    # Cross-Verification with OCR Fields
    comparisons = []
    has_mismatch = False
    has_match = False

    if ocr_fields:
        # 1. Document ID Cross Check
        ocr_doc_num = ocr_fields.get("doc_number")
        if ocr_doc_num:
            # Clean alphanumeric
            clean_ocr_num = re.sub(r'[^A-Z0-9]', '', str(ocr_doc_num).upper())
            clean_payload = re.sub(r'[^A-Z0-9]', '', payload.upper())
            if len(clean_ocr_num) >= 5:
                if clean_ocr_num in clean_payload:
                    comparisons.append({
                        "field": "Document ID Number",
                        "ocr_value": ocr_doc_num,
                        "barcode_value": "Matched in payload",
                        "is_match": True,
                        "severity": "LOW"
                    })
                    has_match = True
                else:
                    # Check if payload contains an alternative ID pattern that conflicts
                    id_conflict = re.search(r'(?:DL|ID|NO|NUM)[:\s\-]*([A-Z0-9]{6,14})', payload, re.IGNORECASE)
                    if id_conflict and id_conflict.group(1).upper() != clean_ocr_num:
                        comparisons.append({
                            "field": "Document ID Number",
                            "ocr_value": ocr_doc_num,
                            "barcode_value": id_conflict.group(1),
                            "is_match": False,
                            "severity": "HIGH"
                        })
                        has_mismatch = True

        # 2. Name Cross Check
        ocr_name = ocr_fields.get("name")
        if ocr_name:
            name_parts = [p.upper() for p in re.split(r'[\s,]+', str(ocr_name)) if len(p) > 2]
            payload_upper = payload.upper()
            
            matched_parts = [p for p in name_parts if p in payload_upper]
            if len(matched_parts) >= max(1, len(name_parts) - 1) and len(name_parts) > 0:
                comparisons.append({
                    "field": "Applicant Name",
                    "ocr_value": ocr_name,
                    "barcode_value": "Verified in payload signature",
                    "is_match": True,
                    "severity": "LOW"
                })
                has_match = True
            elif len(name_parts) >= 2:
                # Check for conflicting name in barcode
                name_in_code = re.search(r'(?:NAME|NAM)[:\s]+([A-Za-z\s]+)', payload, re.IGNORECASE)
                if name_in_code:
                    comparisons.append({
                        "field": "Applicant Name",
                        "ocr_value": ocr_name,
                        "barcode_value": name_in_code.group(1).strip(),
                        "is_match": False,
                        "severity": "HIGH"
                    })
                    has_mismatch = True

        # 3. DOB Cross Check
        ocr_dob = ocr_fields.get("dob")
        if ocr_dob:
            digits_ocr = re.sub(r'\D', '', str(ocr_dob))
            digits_payload = re.sub(r'\D', '', payload)
            if len(digits_ocr) >= 6 and digits_ocr in digits_payload:
                comparisons.append({
                    "field": "Date of Birth",
                    "ocr_value": ocr_dob,
                    "barcode_value": "DOB timestamp matched",
                    "is_match": True,
                    "severity": "LOW"
                })
                has_match = True

    # Determine final barcode status
    if has_mismatch:
        status = "MISMATCH"
        status_detail = f"Data Mismatch! Decoded {format_name} payload conflicts with printed OCR document fields."
    elif has_match:
        status = "MATCH"
        status_detail = f"Decoded {format_name} payload successfully cross-matched with printed OCR visual data."
    else:
        status = "MATCH"
        status_detail = f"Successfully decoded valid {format_name} payload ({len(payload)} bytes). No conflicting visual fields found."

    return {
        "detected": True,
        "status": status,
        "count": len(decoded_barcodes),
        "primary_format": format_name,
        "barcodes": decoded_barcodes,
        "comparison_results": comparisons,
        "status_detail": status_detail,
        "is_genuine_proof_warning": "IMPORTANT: Successfully decoding a QR/barcode confirms digital payload readability, but does NOT prove physical authenticity alone.",
        "payload_summary": payload[:120] + ("..." if len(payload) > 120 else "")
    }
