import re
import cv2
import numpy as np
from typing import Dict, Any, List, Optional
from rapidocr_onnxruntime import RapidOCR

# Initialize OCR engine once (thread-safe local ONNX runtime)
_ocr_engine = None


def get_ocr_engine() -> RapidOCR:
    global _ocr_engine
    if _ocr_engine is None:
        _ocr_engine = RapidOCR()
    return _ocr_engine


def extract_document_ocr(
    bgr_image: np.ndarray,
    preprocessed_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Executes real OCR on the uploaded document image using RapidOCR.
    Extracts raw text, line bboxes, confidence scores, and structures standard ID fields:
    - Name
    - Date of Birth (DOB)
    - Document / ID Number
    - Expiry Date
    - Issue Date
    - Address / Location
    - Document Type Classification
    Handles poor-quality or unreadable images gracefully.
    """
    engine = get_ocr_engine()

    # Preprocessing for optimal OCR readability
    h, w = bgr_image.shape[:2]
    
    # Run OCR on BGR image
    try:
        results, elapse_time = engine(bgr_image)
    except Exception:
        results = None

    # Fallback to enhanced grayscale if initial pass yields few results
    if (results is None or len(results) < 2) and preprocessed_data is not None:
        try:
            norm_gray = preprocessed_data.get("normalized_gray")
            if norm_gray is not None:
                norm_bgr = cv2.cvtColor(norm_gray, cv2.COLOR_GRAY2BGR)
                alt_results, _ = engine(norm_bgr)
                if alt_results and len(alt_results) > (len(results) if results else 0):
                    results = alt_results
        except Exception:
            pass

    if not results:
        is_blurry = preprocessed_data.get("is_blurry", False) if preprocessed_data else False
        warning = "Document text is unreadable or image quality is too low (potential excessive blur or glare)." if is_blurry else "No readable text detected in uploaded document."
        return {
            "is_readable": False,
            "overall_confidence": 0.0,
            "raw_text": "",
            "lines": [],
            "fields": {
                "document_type": "UNKNOWN",
                "name": None,
                "dob": None,
                "doc_number": None,
                "expiry_date": None,
                "issue_date": None,
                "address": None,
                "gender": None,
                "nationality": None,
            },
            "detected_field_count": 0,
            "warning": warning
        }

    # Extract lines and confidence
    lines_data = []
    text_lines = []
    conf_sum = 0.0

    for item in results:
        bbox = item[0]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
        text = str(item[1]).strip()
        conf = float(item[2])

        if text:
            text_lines.append(text)
            conf_sum += conf
            # Convert bbox coords to standard list format
            formatted_box = [[float(pt[0]), float(pt[1])] for pt in bbox] if bbox else []
            lines_data.append({
                "text": text,
                "confidence": round(conf * 100, 1),
                "box": formatted_box
            })

    total_lines = len(lines_data)
    avg_confidence = round((conf_sum / max(1, total_lines)) * 100, 1)
    full_text = "\n".join(text_lines)

    # Intelligent Field Extraction via Regex and Heuristics
    fields = _parse_identity_fields(text_lines, full_text)

    # Count how many key fields were successfully extracted
    key_fields = ["name", "dob", "doc_number", "expiry_date", "address"]
    extracted_count = sum(1 for k in key_fields if fields.get(k) is not None)

    return {
        "is_readable": True,
        "overall_confidence": avg_confidence,
        "raw_text": full_text,
        "lines": lines_data,
        "fields": fields,
        "detected_field_count": extracted_count,
        "warning": None if avg_confidence > 60 else "Low OCR text confidence; some characters may be degraded."
    }


def _parse_identity_fields(lines: List[str], full_text: str) -> Dict[str, Optional[str]]:
    """
    Parses structured identity fields from OCR lines across international and national ID standards:
    - Passports
    - Driver Licenses
    - National Identity Cards (Aadhaar, PAN, Voter ID, Social Security / National IDs)
    """
    fields: Dict[str, Optional[str]] = {
        "document_type": "UNKNOWN",
        "name": None,
        "dob": None,
        "doc_number": None,
        "expiry_date": None,
        "issue_date": None,
        "address": None,
        "gender": None,
        "nationality": None,
    }

    full_upper = full_text.upper()

    # 1. Document Type Detection
    if "PASSPORT" in full_upper or "PASSEPORT" in full_upper:
        fields["document_type"] = "PASSPORT"
    elif "DRIVING LICENCE" in full_upper or "DRIVER LICENSE" in full_upper or "DRIVING LICENSE" in full_upper or "DL NO" in full_upper:
        fields["document_type"] = "DRIVER_LICENSE"
    elif "AADHAAR" in full_upper or "UNIQUE IDENTIFICATION" in full_upper or "MERA AADHAAR" in full_upper or "GOVERNMENT OF INDIA" in full_upper:
        fields["document_type"] = "NATIONAL_ID (AADHAAR)"
    elif "INCOME TAX DEPARTMENT" in full_upper or "PERMANENT ACCOUNT NUMBER" in full_upper or "PAN CARD" in full_upper:
        fields["document_type"] = "NATIONAL_ID (PAN)"
    elif "ELECTION COMMISSION" in full_upper or "VOTER" in full_upper or "ELECTOR" in full_upper:
        fields["document_type"] = "VOTER_ID"
    elif "IDENTITY CARD" in full_upper or "NATIONAL ID" in full_upper or "CITIZEN CARD" in full_upper:
        fields["document_type"] = "NATIONAL_ID"

    # 2. Date of Birth (DOB) Detection
    dob_patterns = [
        r'(?:DOB|D\.O\.B|DATE OF BIRTH|BIRTH DATE|BORN)[:\s]*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](?:19|20)[0-9]{2})',
        r'(?:DOB|D\.O\.B|DATE OF BIRTH)[:\s]*([0-3]?[0-9]\s+[A-Za-z]{3,9}\s+(?:19|20)[0-9]{2})',
        r'(?:YEAR OF BIRTH|YOB)[:\s]*((?:19|20)[0-9]{2})',
        r'\b([0-3][0-9][\/\-\.][0-1][0-9][\/\-\.](?:19|20)[0-9]{2})\b',
        r'\b([0-3]?[0-9]\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*\s+(?:19|20)[0-9]{2})\b',
    ]
    for pattern in dob_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            fields["dob"] = match.group(1).strip()
            break

    # 3. Expiry Date Detection
    exp_patterns = [
        r'(?:EXPIRY|EXPIRATION|VALID TILL|VALID UPTO|EXP DATE|EXP\. DATE)[:\s]*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](?:19|20)[0-9]{2})',
        r'(?:EXPIRY|EXPIRATION|VALID TILL|VALID UPTO)[:\s]*([0-3]?[0-9]\s+[A-Za-z]{3,9}\s+(?:19|20)[0-9]{2})',
    ]
    for pattern in exp_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            fields["expiry_date"] = match.group(1).strip()
            break

    # 4. Issue Date Detection
    iss_patterns = [
        r'(?:ISSUE DATE|DATE OF ISSUE|DOI|ISSUED)[:\s]*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](?:19|20)[0-9]{2})',
        r'(?:ISSUE DATE|DATE OF ISSUE)[:\s]*([0-3]?[0-9]\s+[A-Za-z]{3,9}\s+(?:19|20)[0-9]{2})',
    ]
    for pattern in iss_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            fields["issue_date"] = match.group(1).strip()
            break

    # 5. Document / ID Number Detection
    # Check Aadhaar 12-digit format (XXXX XXXX XXXX)
    aadhaar_match = re.search(r'\b([2-9][0-9]{3}\s+[0-9]{4}\s+[0-9]{4})\b', full_text)
    if aadhaar_match:
        fields["doc_number"] = aadhaar_match.group(1).strip()
        if fields["document_type"] == "UNKNOWN":
            fields["document_type"] = "NATIONAL_ID (AADHAAR)"

    # Check PAN format (5 letters + 4 digits + 1 letter)
    pan_match = re.search(r'\b([A-Z]{5}[0-9]{4}[A-Z])\b', full_text)
    if not fields["doc_number"] and pan_match:
        fields["doc_number"] = pan_match.group(1).strip()
        if fields["document_type"] == "UNKNOWN":
            fields["document_type"] = "NATIONAL_ID (PAN)"

    # Check Passport Number (1 letter + 7-8 digits, or CY-9842011A format)
    passport_match = re.search(r'\b([A-Z]{1,2}[\-]?[0-9]{7,9}[A-Z]?)\b', full_text)
    if not fields["doc_number"] and (fields["document_type"] == "PASSPORT" or "PASSPORT" in full_upper):
        for line in lines:
            if re.search(r'PASSPORT\s*(?:NO|NUMBER)', line, re.IGNORECASE):
                m = re.search(r'[:\s]+([A-Z0-9\-]+)', line)
                if m:
                    fields["doc_number"] = m.group(1).strip()
                    break
        if not fields["doc_number"] and passport_match:
            fields["doc_number"] = passport_match.group(1).strip()

    # General Document Number pattern search
    if not fields["doc_number"]:
        doc_num_patterns = [
            r'(?:PASSPORT NO|DOC NO|DOCUMENT NO|LICENSE NO|DL NO|ID NO|ID NUMBER|CARD NO)[:\.\s]*([A-Z0-9\-\/]{6,20})',
            r'\b([A-Z]{2}[0-9]{2}[0-9]{7,11})\b',  # Indian DL format
        ]
        for pattern in doc_num_patterns:
            match = re.search(pattern, full_text, re.IGNORECASE)
            if match:
                fields["doc_number"] = match.group(1).strip()
                break

    # 6. Name Extraction
    name_patterns = [
        r'(?:SURNAME|NOM)[:\s]+([A-Za-z\s\.\-]+)',
        r'(?:GIVEN NAMES|GIVEN NAME|PRENOMS)[:\s]+([A-Za-z\s\.\-]+)',
        r'(?:NAME|FULL NAME|APPLICANT NAME|CARDHOLDER NAME)[:\s]+([A-Za-z\s\.\-]+)',
    ]
    extracted_names = []
    for pattern in name_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            candidate = match.group(1).split("\n")[0].strip()
            candidate = re.split(r'(?:DOB|DATE|SEX|GENDER|NATIONALITY|ID)', candidate, flags=re.IGNORECASE)[0].strip()
            if len(candidate) > 2 and not any(kw in candidate.upper() for kw in ["REPUBLIC", "GOVERNMENT", "DEPARTMENT", "PASSPORT"]):
                extracted_names.append(candidate)

    if extracted_names:
        fields["name"] = " ".join(extracted_names)
    else:
        for line in lines[:8]:
            cleaned = line.strip()
            if re.match(r'^[A-Z][A-Za-z\s\.\-]{3,30}$', cleaned):
                if not any(kw in cleaned.upper() for kw in ["REPUBLIC", "GOVERNMENT", "INDIA", "STATE", "PASSPORT", "LICENSE", "DEPARTMENT", "IDENTITY", "CARD"]):
                    fields["name"] = cleaned
                    break

    # 7. Gender Detection
    gender_match = re.search(r'\b(?:SEX|GENDER)[:\s]*([MF]|MALE|FEMALE|TRANSGENDER)\b', full_text, re.IGNORECASE)
    if gender_match:
        val = gender_match.group(1).upper()
        fields["gender"] = "MALE" if val in ["M", "MALE"] else ("FEMALE" if val in ["F", "FEMALE"] else val)

    # 8. Nationality Detection
    nat_match = re.search(r'\b(?:NATIONALITY|CITIZENSHIP)[:\s]*([A-Za-z]{3,20})\b', full_text, re.IGNORECASE)
    if nat_match:
        fields["nationality"] = nat_match.group(1).strip()

    # 9. Address Extraction
    addr_match = re.search(r'(?:ADDRESS|ADDR|RESIDENCE)[:\s]+([\w\s,\-\/\.\#]{10,120})', full_text, re.IGNORECASE)
    if addr_match:
        fields["address"] = addr_match.group(1).replace("\n", ", ").strip()

    return fields
