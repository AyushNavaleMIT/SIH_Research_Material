import re
from typing import Dict, Any, List, Optional, Tuple


def _icao_char_value(c: str) -> int:
    """Returns integer value of a character per ICAO 9303 standard."""
    c = c.upper()
    if '0' <= c <= '9':
        return ord(c) - ord('0')
    elif 'A' <= c <= 'Z':
        return ord(c) - ord('A') + 10
    elif c == '<':
        return 0
    return 0


def calculate_icao_check_digit(data_str: str) -> int:
    """
    Calculates ICAO 9303 check digit using weights 7, 3, 1 repeating.
    """
    weights = [7, 3, 1]
    total = 0
    for i, char in enumerate(data_str):
        val = _icao_char_value(char)
        weight = weights[i % 3]
        total += val * weight
    return total % 10


def verify_check_digit(data_str: str, expected_digit_char: str) -> Tuple[bool, int, str]:
    """
    Verifies that calculate_icao_check_digit(data_str) matches expected_digit_char.
    """
    calculated = calculate_icao_check_digit(data_str)
    expected_char = expected_digit_char.strip()
    if expected_char == '<':
        expected_int = 0
    else:
        try:
            expected_int = int(expected_char)
        except ValueError:
            return False, calculated, expected_char
    
    is_valid = (calculated == expected_int)
    return is_valid, calculated, str(expected_int)


def _safe_format_mrz_date(raw_date: str, is_dob: bool = True) -> str:
    """Safely formats YYMMDD string to YYYY-MM-DD."""
    if not raw_date or len(raw_date) < 6:
        return raw_date or "N/A"
    yy, mm, dd = raw_date[0:2], raw_date[2:4], raw_date[4:6]
    try:
        yy_int = int(yy)
        century = "19" if is_dob and yy_int > 30 else "20"
        return f"{century}{yy}-{mm}-{dd}"
    except Exception:
        return f"{yy}-{mm}-{dd}"


def extract_and_validate_mrz(
    ocr_lines: List[str],
    raw_ocr_text: str = "",
    document_type: str = "UNKNOWN"
) -> Dict[str, Any]:
    """
    Authoritative ICAO Doc 9303 MRZ Engine:
    1. If document is Aadhaar, PAN, Driver License, or Voter ID, NEVER run MRZ validation.
    2. MRZ validation runs strictly for documents that are Passports or explicitly contain an ICAO MRZ.
    3. Ignores random OCR garbage from non-MRZ document zones.
    """
    doc_type_upper = str(document_type).upper()

    # Rule 1: Explicitly skip non-travel documents
    if any(t in doc_type_upper for t in ["AADHAAR", "PAN", "DRIVER_LICENSE", "DRIVER LICENSE", "VOTER_ID", "VOTER"]):
        return {
            "mrz_detected": False,
            "is_applicable": False,
            "status": "NOT_APPLICABLE",
            "format": "NONE",
            "raw_lines": [],
            "parsed_fields": {
                "document_type": None,
                "issuing_country": None,
                "surname": None,
                "given_names": None,
                "document_number": None,
                "nationality": None,
                "dob": None,
                "sex": None,
                "expiry_date": None,
                "optional_data": None,
            },
            "checksums": [],
            "all_checksums_valid": True,
            "message": f"MRZ Not Applicable: {document_type} documents use 2D barcodes/visual zones rather than an ICAO MRZ."
        }

    # Filter candidate lines that strictly adhere to ICAO MRZ syntax
    all_lines = list(ocr_lines)
    if raw_ocr_text:
        all_lines.extend(raw_ocr_text.split("\n"))

    mrz_candidates = []
    seen = set()
    for line in all_lines:
        cleaned = re.sub(r'[^A-Z0-9<]', '', line.upper().strip())
        # Strict ICAO check: must start with standard letter and contain filler brackets
        if len(cleaned) >= 28 and cleaned.count('<') >= 3 and cleaned not in seen:
            if cleaned[0] in ['P', 'I', 'A', 'C', 'V']:
                seen.add(cleaned)
                mrz_candidates.append(cleaned)

    # TD3: 2 lines of 44 characters (Passports)
    td3_lines = [c for c in mrz_candidates if 40 <= len(c) <= 48 and c.startswith('P')]
    # TD1: 3 lines of 30 characters (ID Cards)
    td1_lines = [c for c in mrz_candidates if 28 <= len(c) <= 32 and c[0] in ['I', 'A', 'C']]
    # TD2: 2 lines of 36 characters
    td2_lines = [c for c in mrz_candidates if 34 <= len(c) <= 38 and c[0] in ['I', 'A', 'C', 'V']]

    if len(td3_lines) >= 2:
        line1 = td3_lines[0][:44].ljust(44, '<')
        line2 = td3_lines[1][:44].ljust(44, '<')
        return _parse_td3_mrz(line1, line2)
    elif len(td1_lines) >= 3:
        line1 = td1_lines[0][:30].ljust(30, '<')
        line2 = td1_lines[1][:30].ljust(30, '<')
        line3 = td1_lines[2][:30].ljust(30, '<')
        return _parse_td1_mrz(line1, line2, line3)
    elif len(td2_lines) >= 2:
        line1 = td2_lines[0][:36].ljust(36, '<')
        line2 = td2_lines[1][:36].ljust(36, '<')
        return _parse_td2_mrz(line1, line2)
    
    # Check if raw OCR has any MRZ string starting with P<
    joined_mrz = re.search(r'(P<[A-Z0-9<]{38,42})\s*([A-Z0-9<]{40,44})', raw_ocr_text.replace(" ", "").upper())
    if joined_mrz:
        line1 = joined_mrz.group(1)[:44].ljust(44, '<')
        line2 = joined_mrz.group(2)[:44].ljust(44, '<')
        return _parse_td3_mrz(line1, line2)

    # MRZ is NOT applicable for this document
    return {
        "mrz_detected": False,
        "is_applicable": False,
        "status": "NOT_APPLICABLE",
        "format": "NONE",
        "raw_lines": [],
        "parsed_fields": {
            "document_type": None,
            "issuing_country": None,
            "surname": None,
            "given_names": None,
            "document_number": None,
            "nationality": None,
            "dob": None,
            "sex": None,
            "expiry_date": None,
            "optional_data": None,
        },
        "checksums": [],
        "all_checksums_valid": True,
        "message": "MRZ Not Applicable: Document type does not contain an ICAO Machine Readable Zone."
    }


def _parse_td3_mrz(line1: str, line2: str) -> Dict[str, Any]:
    """
    Parses and verifies TD3 (2 lines x 44 chars) MRP Passport MRZ.
    """
    doc_code = line1[0:2].replace('<', '').strip()
    issuing_country = line1[2:5].replace('<', '').strip()
    
    name_part = line1[5:44]
    name_tokens = name_part.split('<<')
    surname = name_tokens[0].replace('<', ' ').strip()
    given_names = name_tokens[1].replace('<', ' ').strip() if len(name_tokens) > 1 else ""

    doc_num = line2[0:9].replace('<', '').strip()
    doc_num_cd = line2[9] if len(line2) > 9 else '<'
    
    nationality = line2[10:13].replace('<', '').strip()
    
    dob_raw = line2[13:19]
    dob_cd = line2[19] if len(line2) > 19 else '<'
    
    sex = line2[20] if len(line2) > 20 else '<'
    sex_formatted = "MALE" if sex == 'M' else ("FEMALE" if sex == 'F' else "UNSPECIFIED")
    
    exp_raw = line2[21:27]
    exp_cd = line2[27] if len(line2) > 27 else '<'
    
    opt_data = line2[28:42].replace('<', '').strip()
    comp_cd = line2[43] if len(line2) > 43 else '<'

    # Checksum 1: Document Number
    v1, calc1, exp1 = verify_check_digit(line2[0:9], doc_num_cd)
    # Checksum 2: DOB
    v2, calc2, exp2 = verify_check_digit(dob_raw, dob_cd)
    # Checksum 3: Expiry
    v3, calc3, exp3 = verify_check_digit(exp_raw, exp_cd)
    # Checksum 4: Composite
    composite_data = line2[0:10] + line2[13:20] + line2[21:43]
    v4, calc4, exp4 = verify_check_digit(composite_data, comp_cd)

    checksum_list = [
        {
            "name": "Passport / Document Number Check Digit",
            "field": "document_number",
            "data": doc_num,
            "expected": exp1,
            "calculated": str(calc1),
            "valid": v1,
            "description": "ICAO 7-3-1 check digit for 9-digit passport number"
        },
        {
            "name": "Date of Birth Check Digit",
            "field": "dob",
            "data": dob_raw,
            "expected": exp2,
            "calculated": str(calc2),
            "valid": v2,
            "description": "ICAO 7-3-1 check digit for holder date of birth"
        },
        {
            "name": "Expiry Date Check Digit",
            "field": "expiry_date",
            "data": exp_raw,
            "expected": exp3,
            "calculated": str(calc3),
            "valid": v3,
            "description": "ICAO 7-3-1 check digit for document expiration date"
        },
        {
            "name": "Overall Composite Check Digit",
            "field": "composite",
            "data": "Composite String",
            "expected": exp4,
            "calculated": str(calc4),
            "valid": v4,
            "description": "Full composite line checksum verifying overall string integrity"
        }
    ]

    all_valid = v1 and v2 and v3 and v4
    status = "VERIFIED" if all_valid else "FAILED"
    msg = (
        "ICAO Doc 9303 TD3 Passport MRZ successfully verified (All 4 Checksums Passed)."
        if all_valid else
        "ICAO 9303 MRZ Checksum Mismatch detected in TD3 string. Possible digital modification of passport numbers or dates."
    )

    return {
        "mrz_detected": True,
        "is_applicable": True,
        "status": status,
        "format": "TD3 (Passport / 44 Chars)",
        "raw_lines": [line1, line2],
        "parsed_fields": {
            "document_type": doc_code or "P",
            "issuing_country": issuing_country,
            "surname": surname,
            "given_names": given_names,
            "document_number": doc_num,
            "nationality": nationality,
            "dob": _safe_format_mrz_date(dob_raw, is_dob=True),
            "dob_raw": dob_raw,
            "sex": sex_formatted,
            "expiry_date": _safe_format_mrz_date(exp_raw, is_dob=False),
            "expiry_raw": exp_raw,
            "optional_data": opt_data or None,
        },
        "checksums": checksum_list,
        "all_checksums_valid": all_valid,
        "message": msg
    }


def _parse_td1_mrz(line1: str, line2: str, line3: str) -> Dict[str, Any]:
    """
    Parses and verifies TD1 (3 lines x 30 chars) National ID Card MRZ.
    """
    doc_code = line1[0:2].replace('<', '').strip()
    issuing_country = line1[2:5].replace('<', '').strip()
    doc_num = line1[5:14].replace('<', '').strip()
    doc_num_cd = line1[14] if len(line1) > 14 else '<'

    dob_raw = line2[0:6]
    dob_cd = line2[6] if len(line2) > 6 else '<'
    sex = line2[7] if len(line2) > 7 else '<'
    exp_raw = line2[8:14]
    exp_cd = line2[14] if len(line2) > 14 else '<'
    nationality = line2[15:18].replace('<', '').strip()

    name_tokens = line3.split('<<')
    surname = name_tokens[0].replace('<', ' ').strip()
    given_names = name_tokens[1].replace('<', ' ').strip() if len(name_tokens) > 1 else ""

    v1, calc1, exp1 = verify_check_digit(line1[5:14], doc_num_cd)
    v2, calc2, exp2 = verify_check_digit(dob_raw, dob_cd)
    v3, calc3, exp3 = verify_check_digit(exp_raw, exp_cd)

    composite_data = line1[5:30] + line2[0:7] + line2[8:15] + line2[18:29]
    comp_cd = line2[29] if len(line2) > 29 else '<'
    v4, calc4, exp4 = verify_check_digit(composite_data, comp_cd)

    checksum_list = [
        {"name": "Document Number Check Digit", "field": "document_number", "data": doc_num, "expected": exp1, "calculated": str(calc1), "valid": v1, "description": "TD1 document number check digit"},
        {"name": "Date of Birth Check Digit", "field": "dob", "data": dob_raw, "expected": exp2, "calculated": str(calc2), "valid": v2, "description": "TD1 DOB check digit"},
        {"name": "Expiry Date Check Digit", "field": "expiry_date", "data": exp_raw, "expected": exp3, "calculated": str(calc3), "valid": v3, "description": "TD1 expiry check digit"},
        {"name": "Overall Composite Check Digit", "field": "composite", "data": "Composite String", "expected": exp4, "calculated": str(calc4), "valid": v4, "description": "TD1 composite check digit"},
    ]

    all_valid = v1 and v2 and v3 and v4
    status = "VERIFIED" if all_valid else "FAILED"

    return {
        "mrz_detected": True,
        "is_applicable": True,
        "status": status,
        "format": "TD1 (ID Card / 30 Chars)",
        "raw_lines": [line1, line2, line3],
        "parsed_fields": {
            "document_type": doc_code or "I",
            "issuing_country": issuing_country,
            "surname": surname,
            "given_names": given_names,
            "document_number": doc_num,
            "nationality": nationality,
            "dob": _safe_format_mrz_date(dob_raw, is_dob=True),
            "dob_raw": dob_raw,
            "sex": "MALE" if sex == 'M' else ("FEMALE" if sex == 'F' else "UNSPECIFIED"),
            "expiry_date": _safe_format_mrz_date(exp_raw, is_dob=False),
            "expiry_raw": exp_raw,
            "optional_data": None,
        },
        "checksums": checksum_list,
        "all_checksums_valid": all_valid,
        "message": "ICAO Doc 9303 TD1 MRZ Verified." if all_valid else "TD1 MRZ Checksum Mismatch."
    }


def _parse_td2_mrz(line1: str, line2: str) -> Dict[str, Any]:
    """
    Parses and verifies TD2 (2 lines x 36 chars) MRZ.
    """
    doc_code = line1[0:2].replace('<', '').strip()
    issuing_country = line1[2:5].replace('<', '').strip()
    name_tokens = line1[5:36].split('<<')
    surname = name_tokens[0].replace('<', ' ').strip()
    given_names = name_tokens[1].replace('<', ' ').strip() if len(name_tokens) > 1 else ""

    doc_num = line2[0:9].replace('<', '').strip()
    doc_num_cd = line2[9] if len(line2) > 9 else '<'
    nationality = line2[10:13].replace('<', '').strip()
    dob_raw = line2[13:19]
    dob_cd = line2[19] if len(line2) > 19 else '<'
    sex = line2[20] if len(line2) > 20 else '<'
    exp_raw = line2[21:27]
    exp_cd = line2[27] if len(line2) > 27 else '<'

    v1, calc1, exp1 = verify_check_digit(line2[0:9], doc_num_cd)
    v2, calc2, exp2 = verify_check_digit(dob_raw, dob_cd)
    v3, calc3, exp3 = verify_check_digit(exp_raw, exp_cd)

    all_valid = v1 and v2 and v3
    status = "VERIFIED" if all_valid else "FAILED"

    return {
        "mrz_detected": True,
        "is_applicable": True,
        "status": status,
        "format": "TD2 (36 Chars)",
        "raw_lines": [line1, line2],
        "parsed_fields": {
            "document_type": doc_code,
            "issuing_country": issuing_country,
            "surname": surname,
            "given_names": given_names,
            "document_number": doc_num,
            "nationality": nationality,
            "dob": _safe_format_mrz_date(dob_raw, is_dob=True),
            "dob_raw": dob_raw,
            "sex": "MALE" if sex == 'M' else ("FEMALE" if sex == 'F' else "UNSPECIFIED"),
            "expiry_date": _safe_format_mrz_date(exp_raw, is_dob=False),
            "expiry_raw": exp_raw,
            "optional_data": None,
        },
        "checksums": [
            {"name": "Document Number Check Digit", "field": "document_number", "data": doc_num, "expected": exp1, "calculated": str(calc1), "valid": v1, "description": "TD2 document number check digit"},
            {"name": "Date of Birth Check Digit", "field": "dob", "data": dob_raw, "expected": exp2, "calculated": str(calc2), "valid": v2, "description": "TD2 DOB check digit"},
            {"name": "Expiry Date Check Digit", "field": "expiry_date", "data": exp_raw, "expected": exp3, "calculated": str(calc3), "valid": v3, "description": "TD2 expiry check digit"},
        ],
        "all_checksums_valid": all_valid,
        "message": "ICAO Doc 9303 TD2 MRZ Verified." if all_valid else "TD2 MRZ Checksum Mismatch."
    }
