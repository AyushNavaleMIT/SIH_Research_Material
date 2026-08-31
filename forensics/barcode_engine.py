import re
import cv2
import numpy as np
from typing import Dict, Any, List, Optional
import xml.etree.ElementTree as ET
import zxingcpp


def parse_aadhaar_qr_payload(payload: str) -> Optional[Dict[str, Any]]:
    """
    Parses standard XML or attribute-formatted Aadhaar QR codes.
    UIDAI standard QR codes contain XML elements like <PrintLetterBarcodeData ... />
    """
    if not payload or ("PrintLetterBarcodeData" not in payload and "uid=" not in payload and "name=" not in payload):
        return None

    extracted: Dict[str, Any] = {}
    try:
        # Try standard XML parse
        clean_xml = payload.strip()
        if not clean_xml.startswith("<"):
            start_idx = clean_xml.find("<")
            if start_idx != -1:
                clean_xml = clean_xml[start_idx:]
        
        root = ET.fromstring(clean_xml)
        for key, val in root.attrib.items():
            extracted[key.lower()] = val
    except Exception:
        # Fallback to regex attribute extraction
        attr_matches = re.findall(r'(\w+)\s*=\s*"([^"]*)"', payload)
        for k, v in attr_matches:
            extracted[k.lower()] = v

    if not extracted:
        return None

    # Map standard UIDAI attributes
    name = extracted.get("name")
    gender = extracted.get("gender")
    yob = extracted.get("yob")
    dob = extracted.get("dob")
    uid = extracted.get("uid")
    co = extracted.get("co")
    dist = extracted.get("dist")
    state = extracted.get("state")
    pc = extracted.get("pc")

    return {
        "is_aadhaar_qr": True,
        "name": name,
        "gender": ("MALE" if gender == "M" else ("FEMALE" if gender == "F" else gender)) if gender else None,
        "dob": dob or (f"{yob}-01-01" if yob else None),
        "yob": yob,
        "uid_masked": f"XXXX-XXXX-{uid[-4:]}" if uid and len(uid) >= 4 else None,
        "uid_raw": uid,
        "care_of": co,
        "district": dist,
        "state": state,
        "pincode": pc,
        "raw_attributes": extracted
    }


def detect_and_verify_barcodes(
    bgr_image: np.ndarray,
    ocr_fields: Optional[Dict[str, Any]] = None,
    preprocessed_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Detects and decodes QR codes, PDF417, DataMatrix, Aztec, and 1D barcodes from document images.
    Features:
    1. Multi-pass decoding (zxing-cpp, OpenCV, and CLAHE enhanced passes).
    2. Intelligent Aadhaar XML QR code decoding & demographic field extraction.
    3. Multi-field cross-verification against printed OCR text.
    4. Explicit status (MATCH, MISMATCH, INVALID, NOT_FOUND).
    5. Clear forensic note on barcode readability vs physical document security.
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

    # Strategy 2: OpenCV QRCodeDetector fallback
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

    # Strategy 3: Contrast-enhanced grayscale pass for degraded/phone photos
    if not decoded_barcodes:
        try:
            gray = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
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
            "aadhaar_qr_data": None,
            "status_detail": "No QR Code or 1D/2D Barcode detected on the document surface.",
            "is_genuine_proof_warning": "Decoding a barcode only verifies data encoding; physical security features still apply.",
            "payload_summary": None,
        }

    # Primary detected barcode
    primary_barcode = decoded_barcodes[0]
    payload = primary_barcode["raw_text"]
    format_name = primary_barcode["format"]

    # Check payload validity
    if not primary_barcode.get("is_valid", True):
        return {
            "detected": True,
            "status": "INVALID",
            "count": len(decoded_barcodes),
            "primary_format": format_name,
            "barcodes": decoded_barcodes,
            "comparison_results": [],
            "aadhaar_qr_data": None,
            "status_detail": f"Damaged or corrupted {format_name} payload detected. Checksum verification failed.",
            "is_genuine_proof_warning": "Decoding a barcode only verifies data encoding; physical security features still apply.",
            "payload_summary": payload[:100] + ("..." if len(payload) > 100 else "")
        }

    # Parse Aadhaar QR if applicable
    aadhaar_qr = parse_aadhaar_qr_payload(payload)

    # Cross-Verification with OCR Fields
    comparisons: List[Dict[str, Any]] = []
    has_mismatch = False
    has_match = False

    if aadhaar_qr and ocr_fields:
        # Aadhaar QR Cross-Check
        # 1. Name Match
        if aadhaar_qr.get("name") and ocr_fields.get("name"):
            qr_name_clean = re.sub(r'[^A-Z]', '', aadhaar_qr["name"].upper())
            ocr_name_clean = re.sub(r'[^A-Z]', '', ocr_fields["name"].upper())
            name_match = (qr_name_clean in ocr_name_clean) or (ocr_name_clean in qr_name_clean) or (qr_name_clean == ocr_name_clean)
            comparisons.append({
                "field": "Applicant Name",
                "ocr_value": ocr_fields["name"],
                "barcode_value": aadhaar_qr["name"],
                "is_match": name_match,
                "severity": "LOW" if name_match else "HIGH"
            })
            if name_match:
                has_match = True
            else:
                has_mismatch = True

        # 2. Gender Match
        if aadhaar_qr.get("gender") and ocr_fields.get("gender"):
            gender_match = aadhaar_qr["gender"].upper() == ocr_fields["gender"].upper()
            comparisons.append({
                "field": "Gender",
                "ocr_value": ocr_fields["gender"],
                "barcode_value": aadhaar_qr["gender"],
                "is_match": gender_match,
                "severity": "LOW" if gender_match else "MEDIUM"
            })
            if gender_match:
                has_match = True

        # 3. DOB / YOB Match
        if (aadhaar_qr.get("dob") or aadhaar_qr.get("yob")) and ocr_fields.get("dob"):
            qr_dob_str = str(aadhaar_qr.get("dob") or aadhaar_qr.get("yob"))
            ocr_dob_digits = re.sub(r'\D', '', str(ocr_fields["dob"]))
            qr_dob_digits = re.sub(r'\D', '', qr_dob_str)
            dob_match = (qr_dob_digits in ocr_dob_digits) or (ocr_dob_digits in qr_dob_digits) or (aadhaar_qr.get("yob") and str(aadhaar_qr["yob"]) in str(ocr_fields["dob"]))
            comparisons.append({
                "field": "Date of Birth (DOB / YOB)",
                "ocr_value": str(ocr_fields["dob"]),
                "barcode_value": qr_dob_str,
                "is_match": dob_match,
                "severity": "LOW" if dob_match else "HIGH"
            })
            if dob_match:
                has_match = True
            else:
                has_mismatch = True

        # 4. PIN code / Address Match
        if aadhaar_qr.get("pincode") and ocr_fields.get("address"):
            pin_in_addr = str(aadhaar_qr["pincode"]) in str(ocr_fields["address"])
            comparisons.append({
                "field": "Postal PIN Code",
                "ocr_value": ocr_fields["address"],
                "barcode_value": str(aadhaar_qr["pincode"]),
                "is_match": pin_in_addr,
                "severity": "LOW"
            })
            if pin_in_addr:
                has_match = True

    elif ocr_fields:
        # Standard Document / Driver License Cross-Check
        # 1. Document ID Cross Check
        ocr_doc_num = ocr_fields.get("doc_number")
        if ocr_doc_num:
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
                name_in_code = re.search(r'(?:NAME|NAM|DAQ)[:\s]+([A-Za-z\s]+)', payload, re.IGNORECASE)
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
        status_detail = f"Decoded {format_name} payload successfully cross-matched with printed visual OCR identity data."
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
        "aadhaar_qr_data": aadhaar_qr,
        "status_detail": status_detail,
        "is_genuine_proof_warning": "IMPORTANT: Successfully decoding a QR/barcode confirms digital payload readability, but does NOT prove physical authenticity alone.",
        "payload_summary": payload[:120] + ("..." if len(payload) > 120 else "")
    }
