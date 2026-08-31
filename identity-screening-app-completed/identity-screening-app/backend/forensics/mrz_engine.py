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
    """Safely formats YYMMDD string to YYYY-MM-DD even if OCR contains characters."""
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
    raw_ocr_text: str = ""
) -> Dict[str, Any]:
    """
    Inspects document OCR lines for ICAO Doc 9303 MRZ lines (TD1, TD2, TD3).
    Parses fields and validates check digits.
    Returns explicit status: VERIFIED, FAILED, NOT_APPLICABLE, or INVALID.
    Never invents MRZ data.
    """
    mrz_candidates = []
    
    all_lines = list(ocr_lines)
    if raw_ocr_text:
        all_lines.extend(raw_ocr_text.split("\n"))

    seen = set()
    for line in all_lines:
        cleaned = re.sub(r'[^A-Z0-9<]', '', line.upper().strip())
        if len(cleaned) >= 28 and cleaned.count('<') >= 2 and cleaned not in seen:
            seen.add(cleaned)
            mrz_candidates.append(cleaned)

    # TD3: 2 lines of 44 characters (Passports)
    td3_lines = [c for c in mrz_candidates if 40 <= len(c) <= 48]
    # TD2: 2 lines of 36 characters
    td2_lines = [c for c in mrz_candidates if 34 <= len(c) <= 38]
    # TD1: 3 lines of 30 characters (ID Cards)
    td1_lines = [c for c in mrz_candidates if 28 <= len(c) <= 32]

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
    
    # Check if raw OCR has any MRZ string broken up
    joined_mrz = re.search(r'([P|I|A|C|V][A-Z0-9<]{40,44})\s*([A-Z0-9<]{40,44})', raw_ocr_text.replace(" ", "").upper())
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

    nationality = line2[10:13].replace('<', '').strip() if len(line2) > 12 else ""
    dob_raw = line2[13:19] if len(line2) >= 19 else "000000"
    dob_cd = line2[19] if len(line2) > 19 else '<'
    sex = line2[20].replace('<', 'X') if len(line2) > 20 else 'X'
    exp_raw = line2[21:27] if len(line2) >= 27 else "000000"
    exp_cd = line2[27] if len(line2) > 27 else '<'
    opt_data = line2[28:42] if len(line2) >= 42 else ""
    opt_cd = line2[42] if len(line2) > 42 else '<'
    composite_cd = line2[43] if len(line2) > 43 else '<'

    checksums = []

    # 1. Document Number Check Digit
    doc_valid, doc_calc, doc_exp = verify_check_digit(line2[0:9], doc_num_cd)
    checksums.append({
        "name": "Document Number Checksum",
        "field": "document_number",
        "data": line2[0:9],
        "expected": doc_exp,
        "calculated": str(doc_calc),
        "valid": doc_valid,
        "description": "Validates 9-digit passport document number"
    })

    # 2. Date of Birth Check Digit
    dob_valid, dob_calc, dob_exp = verify_check_digit(dob_raw, dob_cd)
    checksums.append({
        "name": "Date of Birth Checksum",
        "field": "dob",
        "data": dob_raw,
        "expected": dob_exp,
        "calculated": str(dob_calc),
        "valid": dob_valid,
        "description": "Validates holder YYMMDD birth date"
    })

    # 3. Expiry Date Check Digit
    exp_valid, exp_calc, exp_exp = verify_check_digit(exp_raw, exp_cd)
    checksums.append({
        "name": "Expiry Date Checksum",
        "field": "expiry_date",
        "data": exp_raw,
        "expected": exp_exp,
        "calculated": str(exp_calc),
        "valid": exp_valid,
        "description": "Validates document YYMMDD expiration date"
    })

    # 4. Optional / Personal Number Check Digit (if present)
    opt_valid = True
    if opt_cd != '<' and opt_data.replace('<', ''):
        opt_valid, opt_calc, opt_exp = verify_check_digit(opt_data, opt_cd)
        checksums.append({
            "name": "Optional Personal Number Checksum",
            "field": "optional_data",
            "data": opt_data,
            "expected": opt_exp,
            "calculated": str(opt_calc),
            "valid": opt_valid,
            "description": "Validates secondary national ID or personal number"
        })

    # 5. Composite Check Digit
    comp_data = line2[0:10] + line2[13:20] + line2[21:43]
    comp_valid, comp_calc, comp_exp = verify_check_digit(comp_data, composite_cd)
    checksums.append({
        "name": "Overall Composite Checksum",
        "field": "composite",
        "data": "Composite Check Sequence",
        "expected": comp_exp,
        "calculated": str(comp_calc),
        "valid": comp_valid,
        "description": "Validates overall integrity across all second-line fields"
    })

    all_valid = all(c["valid"] for c in checksums)
    status = "VERIFIED" if all_valid else "FAILED"

    formatted_dob = _safe_format_mrz_date(dob_raw, is_dob=True)
    formatted_exp = _safe_format_mrz_date(exp_raw, is_dob=False)

    message = (
        f"ICAO 9303 TD3 Passport MRZ Verified ({len(checksums)}/{len(checksums)} Checksums Passed)."
        if all_valid else
        f"MRZ Checksum Validation FAILED! Check digit mismatch detected on " + ", ".join([c["name"] for c in checksums if not c["valid"]])
    )

    return {
        "mrz_detected": True,
        "is_applicable": True,
        "status": status,
        "format": "TD3 (Passport / 44 Chars)",
        "raw_lines": [line1, line2],
        "parsed_fields": {
            "document_type": doc_code or "PASSPORT",
            "issuing_country": issuing_country,
            "surname": surname,
            "given_names": given_names,
            "document_number": doc_num,
            "nationality": nationality,
            "dob": formatted_dob,
            "dob_raw": dob_raw,
            "sex": "MALE" if sex == 'M' else ("FEMALE" if sex == 'F' else "UNSPECIFIED"),
            "expiry_date": formatted_exp,
            "expiry_raw": exp_raw,
            "optional_data": opt_data.replace('<', '').strip() or None,
        },
        "checksums": checksums,
        "all_checksums_valid": all_valid,
        "message": message
    }


def _parse_td1_mrz(line1: str, line2: str, line3: str) -> Dict[str, Any]:
    """
    Parses and verifies TD1 (3 lines x 30 chars) National ID MRZ.
    """
    doc_code = line1[0:2].replace('<', '').strip()
    country = line1[2:5].replace('<', '').strip()
    doc_num = line1[5:14].replace('<', '').strip()
    doc_num_cd = line1[14] if len(line1) > 14 else '<'

    dob_raw = line2[0:6] if len(line2) >= 6 else "000000"
    dob_cd = line2[6] if len(line2) > 6 else '<'
    sex = line2[7] if len(line2) > 7 else 'X'
    exp_raw = line2[8:14] if len(line2) >= 14 else "000000"
    exp_cd = line2[14] if len(line2) > 14 else '<'
    nationality = line2[15:18].replace('<', '').strip() if len(line2) >= 18 else ""
    comp_cd = line2[29] if len(line2) > 29 else '<'

    name_tokens = line3.split('<<')
    surname = name_tokens[0].replace('<', ' ').strip()
    given_names = name_tokens[1].replace('<', ' ').strip() if len(name_tokens) > 1 else ""

    checksums = []
    doc_valid, doc_calc, doc_exp = verify_check_digit(line1[5:14], doc_num_cd)
    checksums.append({
        "name": "Document Number Checksum",
        "field": "document_number",
        "data": line1[5:14],
        "expected": doc_exp,
        "calculated": str(doc_calc),
        "valid": doc_valid,
        "description": "Validates 9-digit national ID document number"
    })

    dob_valid, dob_calc, dob_exp = verify_check_digit(dob_raw, dob_cd)
    checksums.append({
        "name": "Date of Birth Checksum",
        "field": "dob",
        "data": dob_raw,
        "expected": dob_exp,
        "calculated": str(dob_calc),
        "valid": dob_valid,
        "description": "Validates holder YYMMDD birth date"
    })

    exp_valid, exp_calc, exp_exp = verify_check_digit(exp_raw, exp_cd)
    checksums.append({
        "name": "Expiry Date Checksum",
        "field": "expiry_date",
        "data": exp_raw,
        "expected": exp_exp,
        "calculated": str(exp_calc),
        "valid": exp_valid,
        "description": "Validates document YYMMDD expiration date"
    })

    comp_data = line1[5:30] + line2[0:7] + line2[8:15] + line2[18:29]
    comp_valid, comp_calc, comp_exp = verify_check_digit(comp_data, comp_cd)
    checksums.append({
        "name": "Overall Composite Checksum",
        "field": "composite",
        "data": "TD1 Composite Sequence",
        "expected": comp_exp,
        "calculated": str(comp_calc),
        "valid": comp_valid,
        "description": "Validates TD1 multi-line integrity"
    })

    all_valid = all(c["valid"] for c in checksums)
    status = "VERIFIED" if all_valid else "FAILED"

    formatted_dob = _safe_format_mrz_date(dob_raw, is_dob=True)
    formatted_exp = _safe_format_mrz_date(exp_raw, is_dob=False)

    return {
        "mrz_detected": True,
        "is_applicable": True,
        "status": status,
        "format": "TD1 (National ID / 30 Chars x 3)",
        "raw_lines": [line1, line2, line3],
        "parsed_fields": {
            "document_type": doc_code or "NATIONAL_ID",
            "issuing_country": country,
            "surname": surname,
            "given_names": given_names,
            "document_number": doc_num,
            "nationality": nationality,
            "dob": formatted_dob,
            "dob_raw": dob_raw,
            "sex": "MALE" if sex == 'M' else ("FEMALE" if sex == 'F' else "UNSPECIFIED"),
            "expiry_date": formatted_exp,
            "expiry_raw": exp_raw,
            "optional_data": None,
        },
        "checksums": checksums,
        "all_checksums_valid": all_valid,
        "message": f"ICAO 9303 TD1 ID Card MRZ ({status})."
    }


def _parse_td2_mrz(line1: str, line2: str) -> Dict[str, Any]:
    """
    Parses and verifies TD2 (2 lines x 36 chars) MRZ.
    """
    doc_code = line1[0:2].replace('<', '').strip()
    country = line1[2:5].replace('<', '').strip()
    name_part = line1[5:36]
    name_tokens = name_part.split('<<')
    surname = name_tokens[0].replace('<', ' ').strip()
    given_names = name_tokens[1].replace('<', ' ').strip() if len(name_tokens) > 1 else ""

    doc_num = line2[0:9].replace('<', '').strip()
    doc_num_cd = line2[9] if len(line2) > 9 else '<'
    nationality = line2[10:13].replace('<', '').strip() if len(line2) >= 13 else ""
    dob_raw = line2[13:19] if len(line2) >= 19 else "000000"
    dob_cd = line2[19] if len(line2) > 19 else '<'
    sex = line2[20] if len(line2) > 20 else 'X'
    exp_raw = line2[21:27] if len(line2) >= 27 else "000000"
    exp_cd = line2[27] if len(line2) > 27 else '<'
    comp_cd = line2[35] if len(line2) > 35 else '<'

    checksums = []
    doc_valid, doc_calc, doc_exp = verify_check_digit(line2[0:9], doc_num_cd)
    checksums.append({
        "name": "Document Number Checksum",
        "field": "document_number",
        "data": line2[0:9],
        "expected": doc_exp,
        "calculated": str(doc_calc),
        "valid": doc_valid,
        "description": "Validates 9-digit TD2 document number"
    })

    dob_valid, dob_calc, dob_exp = verify_check_digit(dob_raw, dob_cd)
    checksums.append({
        "name": "Date of Birth Checksum",
        "field": "dob",
        "data": dob_raw,
        "expected": dob_exp,
        "calculated": str(dob_calc),
        "valid": dob_valid,
        "description": "Validates holder birth date"
    })

    exp_valid, exp_calc, exp_exp = verify_check_digit(exp_raw, exp_cd)
    checksums.append({
        "name": "Expiry Date Checksum",
        "field": "expiry_date",
        "data": exp_raw,
        "expected": exp_exp,
        "calculated": str(exp_calc),
        "valid": exp_valid,
        "description": "Validates expiration date"
    })

    comp_data = line2[0:10] + line2[13:20] + line2[21:35]
    comp_valid, comp_calc, comp_exp = verify_check_digit(comp_data, comp_cd)
    checksums.append({
        "name": "Overall Composite Checksum",
        "field": "composite",
        "data": "TD2 Composite Sequence",
        "expected": comp_exp,
        "calculated": str(comp_calc),
        "valid": comp_valid,
        "description": "Validates TD2 integrity"
    })

    all_valid = all(c["valid"] for c in checksums)
    status = "VERIFIED" if all_valid else "FAILED"

    formatted_dob = _safe_format_mrz_date(dob_raw, is_dob=True)
    formatted_exp = _safe_format_mrz_date(exp_raw, is_dob=False)

    return {
        "mrz_detected": True,
        "is_applicable": True,
        "status": status,
        "format": "TD2 (36 Chars x 2)",
        "raw_lines": [line1, line2],
        "parsed_fields": {
            "document_type": doc_code or "ID_DOCUMENT",
            "issuing_country": country,
            "surname": surname,
            "given_names": given_names,
            "document_number": doc_num,
            "nationality": nationality,
            "dob": formatted_dob,
            "dob_raw": dob_raw,
            "sex": "MALE" if sex == 'M' else ("FEMALE" if sex == 'F' else "UNSPECIFIED"),
            "expiry_date": formatted_exp,
            "expiry_raw": exp_raw,
            "optional_data": None,
        },
        "checksums": checksums,
        "all_checksums_valid": all_valid,
        "message": f"ICAO 9303 TD2 MRZ ({status})."
    }
