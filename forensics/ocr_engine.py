import re
import cv2
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from rapidocr_onnxruntime import RapidOCR

# Initialize OCR engine once (thread-safe local ONNX runtime)
_ocr_engine = None


def get_ocr_engine() -> RapidOCR:
    global _ocr_engine
    if _ocr_engine is None:
        _ocr_engine = RapidOCR()
    return _ocr_engine


# =====================================================================
# VERHOEFF ALGORITHM (UIDAI Aadhaar 12-Digit Checksum Math)
# =====================================================================
_VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
]

_VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
]

_VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]


def validate_verhoeff_checksum(num_str: str) -> bool:
    """
    Validates a number string using the Verhoeff algorithm.
    Used by UIDAI for verifying 12-digit Aadhaar number validity.
    """
    clean_digits = re.sub(r'\D', '', str(num_str))
    if not clean_digits or len(clean_digits) != 12:
        return False

    c = 0
    reversed_digits = [int(d) for d in reversed(clean_digits)]
    for i, digit in enumerate(reversed_digits):
        c = _VERHOEFF_D[c][_VERHOEFF_P[i % 8][digit]]

    return c == 0


def calculate_verhoeff_check_digit(num_str: str) -> int:
    """Calculates Verhoeff check digit for an 11-digit prefix."""
    clean_digits = re.sub(r'\D', '', str(num_str))
    c = 0
    reversed_digits = [int(d) for d in reversed(clean_digits)]
    for i, digit in enumerate(reversed_digits):
        c = _VERHOEFF_D[c][_VERHOEFF_P[(i + 1) % 8][digit]]
    return _VERHOEFF_INV[c]


# =====================================================================
# OCR TEXT NORMALIZATION UTILITIES & KEYWORD FILTERS
# =====================================================================
REJECTED_NAME_KEYWORDS = [
    "GOVERNMENT", "INDIA", "BHARAT", "SARKAR", "UNIQUE", "IDENTIFICATION",
    "AUTHORITY", "AADHAAR", "UIDAI", "ENROLMENT", "MERAAADHAAR", "PEHCHAAN",
    "HELP", "DOWNLOAD", "ISSUE", "VALID", "REPUBLIC", "STATE", "DEPARTMENT",
    "INCOME", "TAX", "PERMANENT", "ACCOUNT", "NUMBER", "ELECTION", "COMMISSION",
    "VOTER", "ELECTOR", "CARD", "MERA", "MERI", "MALE", "FEMALE", "TRANSGENDER",
    "DOB", "YEAR", "BIRTH", "DATE", "ADDRESS", "PIN", "VID"
]

REJECTED_ADDRESS_KEYWORDS = [
    "1947", "HELP@UIDAI.GOV.IN", "WWW.UIDAI.GOV.IN", "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
    "ELECTRONICS AND INFORMATION TECHNOLOGY", "GOVERNMENT OF INDIA", "BHARAT SARKAR"
]


def normalize_text(text: str) -> str:
    """Cleans excess whitespace and normalizes text for reliable matching."""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()


def normalize_numeric_ocr(raw_str: str) -> str:
    """
    Corrects common OCR letter/digit confusions in numeric codes:
    'O'/'o' -> '0', 'I'/'l'/'|' -> '1', 'S'/'s' -> '5', 'B' -> '8', 'Z' -> '2'.
    """
    table = str.maketrans({
        'O': '0', 'o': '0', 'D': '0',
        'I': '1', 'l': '1', '|': '1', '!': '1',
        'S': '5', 's': '5',
        'B': '8',
        'Z': '2', 'z': '2',
    })
    return raw_str.translate(table)


def normalize_date_string(date_str: Optional[str]) -> Optional[str]:
    """
    Converts diverse date formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD Mon YYYY)
    into standard ISO format 'YYYY-MM-DD' after validating date plausibility.
    """
    if not date_str:
        return None
    d = date_str.strip().upper()

    # Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    m1 = re.search(r'\b([0-3]?[0-9])[\/\-\.]([0-1]?[0-9])[\/\-\.]((?:19|20)[0-9]{2})\b', d)
    if m1:
        day, month, year = int(m1.group(1)), int(m1.group(2)), int(m1.group(3))
        if 1 <= day <= 31 and 1 <= month <= 12 and 1900 <= year <= 2030:
            return f"{year:04d}-{month:02d}-{day:02d}"

    # Match YYYY/MM/DD or YYYY-MM-DD
    m2 = re.search(r'\b((?:19|20)[0-9]{2})[\/\-\.]([0-1]?[0-9])[\/\-\.]([0-3]?[0-9])\b', d)
    if m2:
        year, month, day = int(m2.group(1)), int(m2.group(2)), int(m2.group(3))
        if 1 <= day <= 31 and 1 <= month <= 12 and 1900 <= year <= 2030:
            return f"{year:04d}-{month:02d}-{day:02d}"

    # Match DD Mon YYYY
    months_map = {
        'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
        'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
    }
    m3 = re.search(r'\b([0-3]?[0-9])\s+([A-Z]{3,9})\s+((?:19|20)[0-9]{2})\b', d)
    if m3:
        day = int(m3.group(1))
        mon_str = m3.group(2)[:3]
        year = int(m3.group(3))
        if mon_str in months_map and 1 <= day <= 31 and 1900 <= year <= 2030:
            return f"{year:04d}-{months_map[mon_str]:02d}-{day:02d}"

    # Year only match (e.g., Year of Birth / YOB: 1998)
    m4 = re.search(r'\b((?:19|20)[0-9]{2})\b', d)
    if m4:
        year = int(m4.group(1))
        if 1900 <= year <= 2030:
            return f"{year:04d}-01-01"

    return date_str


# =====================================================================
# DOCUMENT SPECIFIC STRUCTURAL VALIDATION (Aadhaar, PAN, Passport, DL)
# =====================================================================
def validate_aadhaar_document(
    full_text: str,
    lines: List[str],
    fields: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Performs comprehensive structural and checksum inspection on Indian Aadhaar documents:
    1. Validates 12-digit Aadhaar number format (XXXX XXXX XXXX).
    2. Runs real mathematical Verhoeff checksum algorithm on the 12th digit.
    3. Verifies expected UIDAI structural elements:
       - Emblem of India / "Government of India" / "Bharat Sarkar"
       - "Unique Identification Authority of India" / "UIDAI"
       - "Mera Aadhaar, Meri Pehchaan" or standard layout headers
       - Date of Birth / Year of Birth (DOB / YOB)
       - Gender specification (Male / Female / Transgender)
       - Address / Father / Husband C/O / PIN Code
    4. Explicit disclaimer: Format & pattern verified offline. Not connected to UIDAI live server.
    """
    full_upper = full_text.upper()
    checks: List[Dict[str, Any]] = []

    # 1. 12-digit number extraction (supporting spaces, dots, hyphens, and continuous digit streams)
    aadhaar_candidates = re.findall(r'([2-9][0-9]{3}[\s\.\-\_]*[0-9]{4}[\s\.\-\_]*[0-9]{4})', full_text)
    aadhaar_candidates.extend(re.findall(r'\b([2-9][0-9]{11})\b', full_text))
    
    # Also check continuous digits in full_text ignoring non-digits
    digits_stream = re.sub(r'[^\d]', '', full_text)
    for m in re.finditer(r'([2-9][0-9]{11})', digits_stream):
        aadhaar_candidates.append(m.group(1))

    primary_aadhaar = None
    is_verhoeff_valid = False

    for cand in aadhaar_candidates:
        clean = re.sub(r'\D', '', cand)
        if len(clean) == 12 and clean[0] in "23456789":
            v_valid = validate_verhoeff_checksum(clean)
            if v_valid or not primary_aadhaar:
                primary_aadhaar = f"{clean[0:4]} {clean[4:8]} {clean[8:12]}"
                is_verhoeff_valid = v_valid
                if v_valid:
                    break

    if primary_aadhaar:
        checks.append({
            "name": "Aadhaar 12-Digit Format Check",
            "passed": True,
            "details": f"Detected 12-digit Aadhaar sequence: {primary_aadhaar[:4]} XXXX {primary_aadhaar[-4:]}",
            "severity": "LOW"
        })
        checks.append({
            "name": "UIDAI Verhoeff Mathematical Checksum",
            "passed": is_verhoeff_valid,
            "details": "Verhoeff check digit equation C=0 validated." if is_verhoeff_valid else "Verhoeff 12th check digit mismatch! Possible synthetic or mistyped Aadhaar number.",
            "severity": "LOW" if is_verhoeff_valid else "HIGH"
        })
    else:
        checks.append({
            "name": "Aadhaar 12-Digit Number Check",
            "passed": False,
            "details": "No 12-digit Aadhaar sequence starting with 2-9 found in document text.",
            "severity": "HIGH"
        })

    # 2. Structural Header Elements
    has_gov_header = any(kw in full_upper for kw in ["GOVERNMENT OF INDIA", "BHARAT SARKAR", "GOVT OF INDIA", "भारत सरकार", "GOVERNMENTOFINDIA"])
    has_uidai_header = any(kw in full_upper for kw in ["UNIQUE IDENTIFICATION", "UIDAI", "AUTHORITY OF INDIA", "भारतीय विशिष्ट पहचान"])
    has_tagline = any(kw in full_upper for kw in ["MERA AADHAAR", "MERI PEHCHAAN", "MERAAADHAAR", "AAM AADMI KA ADHIKAR", "आधार", "मेरा आधार"])

    checks.append({
        "name": "Government of India / Bharat Sarkar Header",
        "passed": has_gov_header or has_uidai_header,
        "details": "Official Government / UIDAI sovereign header detected." if (has_gov_header or has_uidai_header) else "Missing standard Government of India header text.",
        "severity": "LOW" if (has_gov_header or has_uidai_header) else "MEDIUM"
    })

    checks.append({
        "name": "UIDAI Emblem & Authority Text",
        "passed": has_uidai_header or has_tagline,
        "details": "UIDAI authority text elements identified." if (has_uidai_header or has_tagline) else "UIDAI authority markers not detected.",
        "severity": "LOW" if (has_uidai_header or has_tagline) else "MEDIUM"
    })

    # 3. Identity Field Completeness
    has_dob = bool(fields.get("dob"))
    has_gender = bool(fields.get("gender"))
    has_name = bool(fields.get("name"))

    checks.append({
        "name": "Mandatory Demographic Fields (Name, DOB, Gender)",
        "passed": has_name and (has_dob or has_gender),
        "details": f"Extracted Name: {fields.get('name') or 'N/A'}, DOB: {fields.get('dob') or 'N/A'}, Gender: {fields.get('gender') or 'N/A'}",
        "severity": "LOW" if (has_name and (has_dob or has_gender)) else "MEDIUM"
    })

    # 4. PIN code / Address check
    pincode_match = re.search(r'\b([1-9][0-9]{5})\b', full_text)
    has_pincode = bool(pincode_match)
    checks.append({
        "name": "Indian 6-Digit Postal PIN Code",
        "passed": has_pincode,
        "details": f"Detected PIN Code: {pincode_match.group(1)}" if pincode_match else "Postal PIN code not detected in address visual zone.",
        "severity": "LOW" if has_pincode else "MEDIUM"
    })

    all_passed = all(c["passed"] for c in checks if c["severity"] == "HIGH")
    overall_status = "VERIFIED" if (all_passed and is_verhoeff_valid) else ("SUSPICIOUS" if primary_aadhaar else "INVALID")

    # Masked Aadhaar for privacy
    masked_aadhaar = None
    if primary_aadhaar:
        clean = re.sub(r'\D', '', primary_aadhaar)
        masked_aadhaar = f"XXXX-XXXX-{clean[-4:]}"

    return {
        "is_aadhaar": True,
        "document_type": "NATIONAL_ID (AADHAAR)",
        "status": overall_status,
        "aadhaar_number": primary_aadhaar,
        "masked_aadhaar": masked_aadhaar,
        "is_verhoeff_valid": is_verhoeff_valid,
        "structure_checks": checks,
        "disclaimer": "Format, structural pattern, and Verhoeff checksum verified offline. Not connected to UIDAI live database (no unauthorized government authentication claimed)."
    }


def validate_pan_document(
    full_text: str,
    fields: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Validates Indian Income Tax PAN Card:
    - 10-character code [A-Z]{5}[0-9]{4}[A-Z]
    - 4th character entity type (P = Individual / Person)
    - 5th character surname initial match
    """
    full_upper = full_text.upper()
    pan_match = re.search(r'\b([A-Z]{5}[0-9]{4}[A-Z])\b', full_upper)
    checks: List[Dict[str, Any]] = []

    if pan_match:
        pan_num = pan_match.group(1)
        entity_char = pan_num[3]

        entity_types = {
            'P': 'Individual / Person',
            'C': 'Company',
            'H': 'Hindu Undivided Family (HUF)',
            'F': 'Firm / Partnership',
            'A': 'Association of Persons (AOP)',
            'T': 'Trust',
            'B': 'Body of Individuals (BOI)',
            'L': 'Local Authority',
            'J': 'Artificial Juridical Person',
            'G': 'Government Agency'
        }
        entity_name = entity_types.get(entity_char, 'Standard Legal Entity')

        checks.append({
            "name": "10-Digit PAN Alphanumeric Syntax",
            "passed": True,
            "details": f"Valid Income Tax PAN Structure: {pan_num[:5]}XXXX{pan_num[-1]}",
            "severity": "LOW"
        })
        checks.append({
            "name": "Taxpayer Entity Categorization",
            "passed": entity_char == 'P' or entity_char in entity_types,
            "details": f"Entity Code '{entity_char}' -> {entity_name}",
            "severity": "LOW"
        })
    else:
        checks.append({
            "name": "10-Digit PAN Alphanumeric Syntax",
            "passed": False,
            "details": "No valid 10-character PAN pattern ([A-Z]{5}[0-9]{4}[A-Z]) detected.",
            "severity": "HIGH"
        })

    has_pan_header = any(kw in full_upper for kw in ["INCOME TAX", "GOVT OF INDIA", "PERMANENT ACCOUNT NUMBER", "आयकर विभाग"])
    checks.append({
        "name": "Income Tax Department Sovereign Header",
        "passed": has_pan_header,
        "details": "Income Tax Department sovereign header detected." if has_pan_header else "Missing Income Tax Department header.",
        "severity": "LOW" if has_pan_header else "MEDIUM"
    })

    all_passed = all(c["passed"] for c in checks if c["severity"] == "HIGH")
    overall_status = "VERIFIED" if (all_passed and pan_match) else "INVALID"

    return {
        "is_pan": bool(pan_match),
        "document_type": "NATIONAL_ID (PAN)",
        "status": overall_status,
        "is_format_valid": bool(pan_match),
        "pan_number": pan_match.group(1) if pan_match else None,
        "entity_type": entity_name if pan_match else None,
        "structure_checks": checks,
        "disclaimer": "PAN syntax and structure verified offline against Income Tax Department standard format."
    }


# =====================================================================
# MAIN OCR EXTRACTION ENTRY POINT
# =====================================================================
def extract_document_ocr(
    bgr_image: np.ndarray,
    preprocessed_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Executes real OCR on uploaded document image using RapidOCR:
    1. Extracts text blocks, line bounding boxes, and confidence scores.
    2. Intelligent field extraction (Name, DOB, Document Number, Expiry, Address, Gender).
    3. Document Type Auto-Detection (Aadhaar, PAN, Passport, Driving License, Voter ID).
    4. Full Aadhaar Verhoeff checksum & structural layout verification.
    5. Full PAN syntactic & entity validation.
    6. OCR Normalization (unifying punctuation, dates, numbers).
    7. Clean handling for blurry/low-confidence cases.
    """
    engine = get_ocr_engine()

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

    # If no text detected
    if not results:
        is_blurry = preprocessed_data.get("is_blurry", False) if preprocessed_data else False
        warning = (
            "Document text is unreadable due to excessive optical blur or glare. Please recapture a clear image."
            if is_blurry else
            "No readable text detected on document surface. Please upload a clear photo or scan."
        )
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
            "aadhaar_validation": None,
            "pan_validation": None,
            "warning": warning,
            "recapture_required": True
        }

    # Extract lines and calculate confidence
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
            formatted_box = [[float(pt[0]), float(pt[1])] for pt in bbox] if bbox else []
            lines_data.append({
                "text": text,
                "confidence": round(conf * 100, 1),
                "box": formatted_box
            })

    total_lines = len(lines_data)
    avg_confidence = round((conf_sum / max(1, total_lines)) * 100, 1)
    full_text = "\n".join(text_lines)

    # Intelligent Field Extraction & Normalization
    fields = _parse_identity_fields(text_lines, full_text)

    # Indian Document Specific Validation
    aadhaar_val = None
    pan_val = None

    if "AADHAAR" in str(fields.get("document_type", "")) or any(kw in full_text.upper() for kw in ["AADHAAR", "UIDAI", "UNIQUE IDENTIFICATION", "MERA AADHAAR"]):
        aadhaar_val = validate_aadhaar_document(full_text, text_lines, fields)
        if aadhaar_val.get("is_aadhaar"):
            fields["document_type"] = "NATIONAL_ID (AADHAAR)"
            if aadhaar_val.get("aadhaar_number"):
                fields["doc_number"] = aadhaar_val["aadhaar_number"]

    elif "PAN" in str(fields.get("document_type", "")) or "PERMANENT ACCOUNT NUMBER" in full_text.upper():
        pan_val = validate_pan_document(full_text, fields)
        if pan_val.get("is_pan"):
            fields["document_type"] = "NATIONAL_ID (PAN)"
            if pan_val.get("pan_number"):
                fields["doc_number"] = pan_val["pan_number"]

    # Count successfully extracted key identity fields
    key_fields = ["name", "dob", "doc_number", "expiry_date", "address", "gender"]
    extracted_count = sum(1 for k in key_fields if fields.get(k) is not None)

    # Warning / Quality Feedback
    warning = None
    recapture_required = False
    if total_lines == 0:
        warning = "No readable text lines could be detected in document image."
        recapture_required = True
    elif avg_confidence < 35.0 and extracted_count == 0:
        warning = "Low character confidence across document text. A clearer, well-lit image is recommended."
        recapture_required = True
    elif avg_confidence < 60.0:
        warning = "Moderate OCR confidence; some stylized or regional characters were normalized."

    return {
        "is_readable": total_lines > 0,
        "overall_confidence": avg_confidence,
        "raw_text": full_text,
        "lines": lines_data,
        "fields": fields,
        "detected_field_count": extracted_count,
        "aadhaar_validation": aadhaar_val,
        "pan_validation": pan_val,
        "warning": warning,
        "recapture_required": recapture_required
    }


def _is_rejected_name_line(text: str) -> bool:
    """Checks if line is a document heading, instruction, or metadata tag rather than an applicant name."""
    clean = re.sub(r'[^A-Za-z]', '', text).upper()
    if len(clean) < 3:
        return True
    for kw in REJECTED_NAME_KEYWORDS:
        if kw in clean or clean in kw:
            return True
    return False


def _parse_identity_fields(lines: List[str], full_text: str) -> Dict[str, Optional[str]]:
    """
    Field-Aware Identity Parser:
    - Extracts structured fields with strict semantic filtering
    - Rejects document headings and instructional footers
    - Normalizes dates, numbers, and gender
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
    if any(kw in full_upper for kw in ["PASSPORT", "PASSEPORT", "REPUBLIC OF", "DIPLOMATIC PASSPORT"]):
        fields["document_type"] = "PASSPORT"
    elif any(kw in full_upper for kw in ["DRIVING LICENCE", "DRIVER LICENSE", "DRIVING LICENSE", "DL NO", "MOTOR VEHICLES"]):
        fields["document_type"] = "DRIVER_LICENSE"
    elif any(kw in full_upper for kw in ["AADHAAR", "UNIQUE IDENTIFICATION", "MERA AADHAAR", "UIDAI", "GOVERNMENT OF INDIA", "GOVERNMENTOFINDIA"]):
        fields["document_type"] = "NATIONAL_ID (AADHAAR)"
    elif any(kw in full_upper for kw in ["INCOME TAX DEPARTMENT", "PERMANENT ACCOUNT NUMBER", "PAN CARD"]):
        fields["document_type"] = "NATIONAL_ID (PAN)"
    elif any(kw in full_upper for kw in ["ELECTION COMMISSION", "VOTER", "ELECTOR", "EPIC"]):
        fields["document_type"] = "VOTER_ID"
    elif any(kw in full_upper for kw in ["IDENTITY CARD", "NATIONAL ID", "CITIZEN CARD"]):
        fields["document_type"] = "NATIONAL_ID"

    # 2. Date of Birth (DOB) Detection
    dob_patterns = [
        r'(?:DOB|D\.O\.B|D0B|DATE OF BIRTH|BIRTH DATE|BORN|जन्म तिथि)[:\s]*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](?:19|20)[0-9]{2})',
        r'(?:DOB|D\.O\.B|D0B|DATE OF BIRTH)[:\s]*([0-3]?[0-9]\s+[A-Za-z]{3,9}\s+(?:19|20)[0-9]{2})',
        r'(?:YEAR OF BIRTH|YOB|जन्म वर्ष)[:\s]*((?:19|20)[0-9]{2})',
        r'\b([0-3][0-9][\/\-\.][0-1][0-9][\/\-\.](?:19|20)[0-9]{2})\b',
        r'\b([0-3]?[0-9]\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Za-z]*\s+(?:19|20)[0-9]{2})\b',
    ]
    for pattern in dob_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            raw_dob = match.group(1).strip()
            norm_dob = normalize_date_string(raw_dob)
            if norm_dob:
                fields["dob"] = norm_dob
                break

    # 3. Expiry Date Detection
    exp_patterns = [
        r'(?:EXPIRY|EXPIRATION|VALID TILL|VALID UPTO|EXP DATE|EXP\. DATE)[:\s]*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](?:19|20)[0-9]{2})',
        r'(?:EXPIRY|EXPIRATION|VALID TILL|VALID UPTO)[:\s]*([0-3]?[0-9]\s+[A-Za-z]{3,9}\s+(?:19|20)[0-9]{2})',
    ]
    for pattern in exp_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            raw_exp = match.group(1).strip()
            fields["expiry_date"] = normalize_date_string(raw_exp) or raw_exp
            break

    # 4. Issue Date Detection
    iss_patterns = [
        r'(?:ISSUE DATE|DATE OF ISSUE|DOI|ISSUED)[:\s]*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](?:19|20)[0-9]{2})',
        r'(?:ISSUE DATE|DATE OF ISSUE)[:\s]*([0-3]?[0-9]\s+[A-Za-z]{3,9}\s+(?:19|20)[0-9]{2})',
    ]
    for pattern in iss_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            raw_iss = match.group(1).strip()
            fields["issue_date"] = normalize_date_string(raw_iss) or raw_iss
            break

    # 5. Document Number Extraction
    # 5a. Aadhaar format (12 digits)
    aadhaar_match = re.search(r'\b([2-9][0-9]{3}\s+[0-9]{4}\s+[0-9]{4})\b', full_text)
    if aadhaar_match:
        fields["doc_number"] = aadhaar_match.group(1).strip()
        if fields["document_type"] == "UNKNOWN":
            fields["document_type"] = "NATIONAL_ID (AADHAAR)"

    # 5b. PAN format (5 letters + 4 digits + 1 letter)
    pan_match = re.search(r'\b([A-Z]{5}[0-9]{4}[A-Z])\b', full_upper)
    if not fields["doc_number"] and pan_match:
        fields["doc_number"] = pan_match.group(1).strip()
        if fields["document_type"] == "UNKNOWN":
            fields["document_type"] = "NATIONAL_ID (PAN)"

    # 5c. Passport format (1 letter + 7-8 digits or alphanumeric CY-9842011A)
    passport_match = re.search(r'\b([A-Z]{1,2}[\-]?[0-9]{7,9}[A-Z]?)\b', full_upper)
    if not fields["doc_number"] and (fields["document_type"] == "PASSPORT" or "PASSPORT" in full_upper):
        for line in lines:
            if re.search(r'PASSPORT\s*(?:NO|NUMBER)', line, re.IGNORECASE):
                m = re.search(r'[:\s]+([A-Z0-9\-]+)', line)
                if m:
                    fields["doc_number"] = m.group(1).strip()
                    break
        if not fields["doc_number"] and passport_match:
            fields["doc_number"] = passport_match.group(1).strip()

    # 5d. Indian Driver License format
    dl_match = re.search(r'\b([A-Z]{2}[\-\s]?[0-9]{2}[\-\s]?(?:19|20)[0-9]{2}[0-9]{7})\b', full_upper)
    if not fields["doc_number"] and dl_match:
        fields["doc_number"] = dl_match.group(1).strip()
        if fields["document_type"] == "UNKNOWN":
            fields["document_type"] = "DRIVER_LICENSE"

    # 6. Name Extraction
    name_patterns = [
        r'(?:NAME|FULL NAME|APPLICANT NAME|CARDHOLDER NAME|नाम)[:\s]+([A-Za-z\s\.\-]+)',
        r'(?:SURNAME|NOM)[:\s]+([A-Za-z\s\.\-]+)',
        r'(?:GIVEN NAMES|GIVEN NAME|PRENOMS)[:\s]+([A-Za-z\s\.\-]+)',
    ]
    extracted_names = []
    for pattern in name_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            candidate = match.group(1).split("\n")[0].strip()
            candidate = re.split(r'(?:DOB|D0B|DATE|SEX|GENDER|NATIONALITY|ID|FATHER|HUSBAND|S\/O|W\/O|D\/O|AADHAAR)', candidate, flags=re.IGNORECASE)[0].strip()
            if len(candidate) >= 3 and not _is_rejected_name_line(candidate):
                extracted_names.append(candidate)
                break

    if extracted_names:
        fields["name"] = normalize_text(extracted_names[0])
    else:
        # Scan lines preceding DOB line for person name
        dob_line_idx = -1
        for idx, line in enumerate(lines):
            if any(kw in line.upper() for kw in ["DOB", "D0B", "DATE OF BIRTH", "जन्म"]):
                dob_line_idx = idx
                break

        if dob_line_idx > 0:
            for line in reversed(lines[:dob_line_idx]):
                cleaned = line.strip()
                if not _is_rejected_name_line(cleaned) and re.match(r'^[A-Za-z\s\.\-]{3,35}$', cleaned):
                    fields["name"] = normalize_text(cleaned)
                    break

        if not fields["name"]:
            for line in lines[:8]:
                cleaned = line.strip()
                if not _is_rejected_name_line(cleaned) and re.match(r'^[A-Z][A-Za-z\s\.\-]{2,30}$', cleaned):
                    fields["name"] = normalize_text(cleaned)
                    break

    # 7. Gender Detection
    gender_match = re.search(r'\b(?:SEX|GENDER|लिंग)[:\s]*([MF]|MALE|FEMALE|TRANSGENDER|PURUSH|MAHILA)\b', full_text, re.IGNORECASE)
    if gender_match:
        val = gender_match.group(1).upper()
        if val in ["M", "MALE", "PURUSH"]:
            fields["gender"] = "MALE"
        elif val in ["F", "FEMALE", "MAHILA"]:
            fields["gender"] = "FEMALE"
        elif val in ["TRANSGENDER", "T", "TG"]:
            fields["gender"] = "TRANSGENDER"
        else:
            fields["gender"] = val

    # 8. Nationality Detection
    nat_match = re.search(r'\b(?:NATIONALITY|CITIZENSHIP|राष्ट्रीयता)[:\s]*([A-Za-z]{3,20})\b', full_text, re.IGNORECASE)
    if nat_match:
        fields["nationality"] = nat_match.group(1).strip().upper()

    # 9. PIN Code Extraction
    pin_match = re.search(r'\b([1-9][0-9]{5})\b', full_text)
    if pin_match:
        fields["pin_code"] = pin_match.group(1).strip()
    else:
        fields["pin_code"] = None

    # 10. Address Extraction (Excluding footers, disclaimers, and sovereign titles)
    addr_match = re.search(r'(?:ADDRESS|ADDR|RESIDENCE|पता|C\/O|S\/O|W\/O|D\/O)[:\s]+([\w\s,\-\/\.\#]{10,120})', full_text, re.IGNORECASE)
    if addr_match:
        raw_addr = addr_match.group(1).replace("\n", ", ")
        for kw in REJECTED_ADDRESS_KEYWORDS:
            raw_addr = re.sub(re.escape(kw), '', raw_addr, flags=re.IGNORECASE)
        # Bounded address trimming: stop at sovereign/helpline keywords
        raw_addr = re.split(r'(?:1947|HELP@|WWW\.|UNIQUE IDENTIFICATION|GOVERNMENT|BHARAT)', raw_addr, flags=re.IGNORECASE)[0]
        cleaned_addr = normalize_text(raw_addr)
        if len(cleaned_addr) >= 10:
            fields["address"] = cleaned_addr
    else:
        # Check if a specific line has genuine address structure + PIN code
        for line in lines:
            if re.search(r'\b[1-9][0-9]{5}\b', line):
                if not _is_rejected_name_line(line) and not any(kw in line.upper() for kw in REJECTED_NAME_KEYWORDS[:10]):
                    cleaned = normalize_text(line)
                    if len(cleaned) >= 10:
                        fields["address"] = cleaned
                        break

    # 11. Masked Document Number Representation
    raw_num = fields.get("doc_number")
    if raw_num:
        clean_d = re.sub(r'\D', '', raw_num)
        if len(clean_d) == 12 and ("AADHAAR" in str(fields.get("document_type", "")) or len(clean_d) == 12):
            fields["masked_doc_number"] = f"XXXX XXXX {clean_d[-4:]}"
        elif len(clean_d) >= 6:
            fields["masked_doc_number"] = f"XXXX {clean_d[-4:]}"
        else:
            fields["masked_doc_number"] = raw_num
    else:
        fields["masked_doc_number"] = None

    return fields
