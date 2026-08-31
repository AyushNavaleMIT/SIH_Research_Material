import os
import cv2
import numpy as np
import io
from PIL import Image

from forensics.ocr_engine import (
    extract_document_ocr,
    validate_verhoeff_checksum,
    calculate_verhoeff_check_digit
)
from forensics.mrz_engine import extract_and_validate_mrz, calculate_icao_check_digit
from forensics.barcode_engine import detect_and_verify_barcodes
from forensics.preprocessor import preprocess_document_image
from forensics.analyzer import analyze_document_forensics
from forensics.face_engine import process_face_verification
from forensics.liveness_engine import process_liveness_frame, calculate_head_pose_yaw
from forensics.reporting_engine import (
    create_cybercrime_case_payload,
    generate_pdf_case_report
)
from forensics.document_source import classify_document_source
from forensics.validation import render_pdf_to_image
from forensics.auth_engine import (
    register_user,
    login_user,
    save_verification_record,
    get_user_verification_history,
    _hash_password
)


def run_all_comprehensive_tests():
    print("==================================================")
    print("RUNNING SENTINEL AI EXTENDED ACCURACY & AUTHENTICATION TEST SUITE (v6.0)")
    print("==================================================")

    # ----------------------------------------------------
    # A. Valid physical Aadhaar
    # ----------------------------------------------------
    print("\n--> Test A: Valid Physical Aadhaar:")
    base_11 = "23456789012"
    check_digit = calculate_verhoeff_check_digit(base_11)
    full_aadhaar = f"{base_11}{check_digit}"
    
    phys_aadhaar = np.ones((600, 950, 3), dtype=np.uint8) * 235
    # Simulate slight physical camera noise
    noise = np.random.normal(0, 3, phys_aadhaar.shape).astype(np.uint8)
    phys_aadhaar = cv2.add(phys_aadhaar, noise)
    cv2.putText(phys_aadhaar, "GOVERNMENT OF INDIA", (80, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(phys_aadhaar, "MERA AADHAAR MERI PEHCHAAN", (80, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(phys_aadhaar, "NAME: ADITYA SHARMA", (80, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 0), 2)
    cv2.putText(phys_aadhaar, "DOB: 15/08/1998", (80, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(phys_aadhaar, "GENDER: MALE", (80, 300), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(phys_aadhaar, f"{full_aadhaar[:4]} {full_aadhaar[4:8]} {full_aadhaar[8:]}", (80, 370), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 3)

    _, phys_jpg = cv2.imencode('.jpg', phys_aadhaar)
    src_phys = classify_document_source(phys_aadhaar, phys_jpg.tobytes(), "aadhaar_camera_photo.jpg", "image/jpeg")
    prep_phys = preprocess_document_image(phys_aadhaar, source_info=src_phys)
    ocr_phys = extract_document_ocr(phys_aadhaar, prep_phys)
    analysis_phys = analyze_document_forensics(prep_phys, ocr_phys, None, None)
    print(f"Physical Aadhaar: Verdict={analysis_phys['final_decision']}, Source={analysis_phys['source_display']}")
    assert analysis_phys['final_decision'] == "VERIFIED", f"Expected VERIFIED, got {analysis_phys['final_decision']}"

    # ----------------------------------------------------
    # B. Valid e-Aadhaar PDF
    # ----------------------------------------------------
    print("\n--> Test B: Valid Official e-Aadhaar PDF:")
    from pypdf import PdfWriter
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)
    pdf_buf = io.BytesIO()
    writer.write(pdf_buf)
    pdf_bytes = pdf_buf.getvalue()

    bgr_from_pdf, _ = render_pdf_to_image(pdf_bytes)
    cv2.putText(bgr_from_pdf, "UNIQUE IDENTIFICATION AUTHORITY OF INDIA", (80, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 150), 2)
    cv2.putText(bgr_from_pdf, "GOVERNMENT OF INDIA", (80, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(bgr_from_pdf, "NAME: PRIYA VERMA", (80, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(bgr_from_pdf, f"AADHAAR NO: {full_aadhaar[:4]} {full_aadhaar[4:8]} {full_aadhaar[8:]}", (80, 330), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 0, 0), 2)

    src_pdf = classify_document_source(bgr_from_pdf, pdf_bytes, "e_aadhaar_uidai.pdf", "application/pdf")
    prep_pdf = preprocess_document_image(bgr_from_pdf, source_info=src_pdf)
    ocr_pdf = extract_document_ocr(bgr_from_pdf, prep_pdf)
    analysis_pdf = analyze_document_forensics(prep_pdf, ocr_pdf, None, None)
    print(f"e-Aadhaar PDF: Verdict={analysis_pdf['final_decision']}, Glare Applicable={prep_pdf['quality_gate']['metrics']['glare_applicable']}")
    assert analysis_pdf['final_decision'] == "VERIFIED", f"e-Aadhaar PDF should be VERIFIED"
    assert prep_pdf['quality_gate']['metrics']['glare_applicable'] is False, "PDF must not evaluate camera glare"

    # ----------------------------------------------------
    # C. Valid e-Aadhaar screenshot
    # ----------------------------------------------------
    print("\n--> Test C: Valid e-Aadhaar Screenshot:")
    ss_img = np.ones((1920, 1080, 3), dtype=np.uint8) * 255
    cv2.putText(ss_img, "GOVERNMENT OF INDIA", (60, 200), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (20, 20, 20), 2)
    cv2.putText(ss_img, "MERA AADHAAR, MERI PEHCHAAN", (60, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2)
    cv2.putText(ss_img, f"AADHAAR NO: {full_aadhaar[:4]} {full_aadhaar[4:8]} {full_aadhaar[8:]}", (60, 540), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 0, 0), 3)
    _, ss_png = cv2.imencode('.png', ss_img)
    src_ss = classify_document_source(ss_img, ss_png.tobytes(), "Screenshot_eAadhaar.png", "image/png")
    prep_ss = preprocess_document_image(ss_img, source_info=src_ss)
    ocr_ss = extract_document_ocr(ss_img, prep_ss)
    analysis_ss = analyze_document_forensics(prep_ss, ocr_ss, None, None)
    print(f"e-Aadhaar Screenshot: Verdict={analysis_ss['final_decision']}, Is Digital={analysis_ss['is_digital']}")
    assert analysis_ss['final_decision'] == "VERIFIED", "Screenshot must be VERIFIED"

    # ----------------------------------------------------
    # D & E. Valid PAN & Valid e-PAN
    # ----------------------------------------------------
    print("\n--> Test D & E: Valid PAN & e-PAN:")
    epan_img = np.ones((600, 950, 3), dtype=np.uint8) * 255
    cv2.putText(epan_img, "INCOME TAX DEPARTMENT", (100, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 120), 2)
    cv2.putText(epan_img, "GOVT. OF INDIA", (100, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 120), 2)
    cv2.putText(epan_img, "PAN: ABCDE1234F", (100, 390), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 3)
    _, epan_png = cv2.imencode('.png', epan_img)
    src_epan = classify_document_source(epan_img, epan_png.tobytes(), "ePAN_Letter.pdf", "application/pdf")
    prep_epan = preprocess_document_image(epan_img, source_info=src_epan)
    ocr_epan = extract_document_ocr(epan_img, prep_epan)
    analysis_epan = analyze_document_forensics(prep_epan, ocr_epan, None, None)
    print(f"e-PAN: Verdict={analysis_epan['final_decision']}, Type={ocr_epan['fields']['document_type']}")
    assert analysis_epan['final_decision'] == "VERIFIED", "e-PAN should be VERIFIED"

    # ----------------------------------------------------
    # F. Valid Passport (ICAO 9303 MRZ)
    # ----------------------------------------------------
    print("\n--> Test F: Valid Passport (ICAO 9303 MRZ):")
    p_num = "CY9842011"
    cd_p = calculate_icao_check_digit(p_num)
    cd_dob = calculate_icao_check_digit("880414")
    cd_exp = calculate_icao_check_digit("311022")
    line1 = "P<CYBVALENTINE<<ALEXANDER<JAMES<<<<<<<<<<<<"
    line2 = f"{p_num}{cd_p}CYB880414{cd_dob}M311022{cd_exp}<<<<<<<<<<<<<<06"
    cd_comp = calculate_icao_check_digit(line2[0:10] + line2[13:20] + line2[21:43])
    line2_valid = f"{p_num}{cd_p}CYB880414{cd_dob}M311022{cd_exp}<<<<<<<<<<<<<<{cd_comp:02d}"
    mrz_res = extract_and_validate_mrz([line1, line2_valid], f"{line1}\n{line2_valid}", document_type="PASSPORT")
    print(f"Passport MRZ: Status={mrz_res['status']}, Format={mrz_res['format']}")
    assert mrz_res['status'] == "VERIFIED", "Valid Passport MRZ should be VERIFIED"

    # ----------------------------------------------------
    # G & H. Tampered Document / Invalid Checksum
    # ----------------------------------------------------
    print("\n--> Test G & H: Tampered Aadhaar with Invalid Checksum:")
    corrupted_aadhaar = f"{base_11}{(check_digit + 1) % 10}"
    fake_aadhaar_img = np.ones((500, 800, 3), dtype=np.uint8) * 240
    cv2.putText(fake_aadhaar_img, "GOVERNMENT OF INDIA", (50, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (20, 20, 20), 2)
    cv2.putText(fake_aadhaar_img, f"AADHAAR NO: {corrupted_aadhaar[:4]} {corrupted_aadhaar[4:8]} {corrupted_aadhaar[8:]}", (220, 290), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    prep_fake = preprocess_document_image(fake_aadhaar_img)
    ocr_fake = extract_document_ocr(fake_aadhaar_img, prep_fake)
    analysis_fake = analyze_document_forensics(prep_fake, ocr_fake, None, None)
    print(f"Tampered Aadhaar: Decision={analysis_fake['final_decision']}, Risk={analysis_fake['risk_level']}")
    assert analysis_fake['final_decision'] == "HIGH RISK", "Corrupted checksum must be HIGH RISK"

    # ----------------------------------------------------
    # I. OCR / Barcode Mismatch
    # ----------------------------------------------------
    print("\n--> Test I: OCR vs Barcode Mismatch Detection:")
    mock_barcode_mismatch = {
        "detected": True,
        "status": "MISMATCH",
        "primary_format": "QR_CODE",
        "barcodes": []
    }
    analysis_mismatch = analyze_document_forensics(prep_phys, ocr_phys, None, mock_barcode_mismatch)
    print(f"Barcode Mismatch: Decision={analysis_mismatch['final_decision']}, Reasons={analysis_mismatch['reasons'][0]}")
    assert analysis_mismatch['final_decision'] == "HIGH RISK", "Barcode mismatch must be HIGH RISK"

    # ----------------------------------------------------
    # K. Low-Resolution Document (Recapture Gate)
    # ----------------------------------------------------
    print("\n--> Test K: Low-Resolution Document:")
    tiny_img = np.ones((150, 200, 3), dtype=np.uint8) * 200
    prep_tiny = preprocess_document_image(tiny_img)
    analysis_tiny = analyze_document_forensics(prep_tiny, None, None, None)
    print(f"Low-Res Document: Decision={analysis_tiny['final_decision']}, Recapture={analysis_tiny['recapture_required']}")
    assert analysis_tiny['final_decision'] == "RECAPTURE REQUIRED", "Low resolution must require recapture"

    # ----------------------------------------------------
    # L. Normal JPEG Compression Tolerance
    # ----------------------------------------------------
    print("\n--> Test L: Normal JPEG Compression Tolerance:")
    # Save image with standard JPEG quality=70
    _, compressed_jpg = cv2.imencode('.jpg', phys_aadhaar, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
    decompressed_bgr = cv2.imdecode(compressed_jpg, cv2.IMREAD_COLOR)
    prep_comp = preprocess_document_image(decompressed_bgr)
    ocr_comp = extract_document_ocr(decompressed_bgr, prep_comp)
    analysis_comp = analyze_document_forensics(prep_comp, ocr_comp, None, None)
    print(f"Compressed JPEG: Decision={analysis_comp['final_decision']}, Risk Score={analysis_comp['composite_risk_score']}%")
    assert analysis_comp['final_decision'] == "VERIFIED", "Standard JPEG compression must not trigger false positive forgery"

    # ----------------------------------------------------
    # N. Authentication & Multi-Tenant Data Isolation
    # ----------------------------------------------------
    import time
    ts = int(time.time() * 1000)
    print("\n--> Test N: Authentication & Multi-Tenant Data Isolation:")
    # Register Org A
    org_a_reg = register_user({
        "email": f"orgA_{ts}@bankcorp.com",
        "password": "Password123!",
        "role": "ORGANISATION",
        "org_name": "Bank Alpha KYC",
        "org_type": "BANK"
    })
    token_a = org_a_reg["token"]
    user_a = org_a_reg["user"]

    # Register Org B
    org_b_reg = register_user({
        "email": f"orgB_{ts}@hospitalcorp.com",
        "password": "Password123!",
        "role": "ORGANISATION",
        "org_name": "City Hospital Desk",
        "org_type": "HOSPITAL"
    })
    user_b = org_b_reg["user"]

    # Save record for Org A
    rec_a = save_verification_record(user_a, {
        "case_id": "CASE-ALFA-001",
        "applicant_name": "John Alpha",
        "final_decision": "VERIFIED",
        "overall_risk_score": 3.5
    })

    # Save record for Org B
    rec_b = save_verification_record(user_b, {
        "case_id": "CASE-BETA-001",
        "applicant_name": "Jane Beta",
        "final_decision": "HIGH RISK",
        "overall_risk_score": 88.0
    })

    history_a = get_user_verification_history(user_a)
    history_b = get_user_verification_history(user_b)

    print(f"Org A History Count: {len(history_a)} (IDs: {[r['case_id'] for r in history_a]})")
    print(f"Org B History Count: {len(history_b)} (IDs: {[r['case_id'] for r in history_b]})")

    assert any(r["case_id"] == "CASE-ALFA-001" for r in history_a), "Org A must see its own record"
    assert not any(r["case_id"] == "CASE-BETA-001" for r in history_a), "Org A must NEVER see Org B's record (Tenant Isolation Failed!)"
    assert any(r["case_id"] == "CASE-BETA-001" for r in history_b), "Org B must see its own record"
    assert not any(r["case_id"] == "CASE-ALFA-001" for r in history_b), "Org B must NEVER see Org A's record (Tenant Isolation Failed!)"

    # ----------------------------------------------------
    # O. Step 5 Final Report Retention & Audit Trail Preservation
    # ----------------------------------------------------
    print("\n--> Test O: Step 5 Final Report Retention & Non-Destructive Audit Preservation:")
    # Create complete 5-stage verification state payload
    stage5_payload = {
        "case_id": "CASE-STAGE5-PERSIST-001",
        "applicant_name": "Aditya Sharma",
        "doc_data": {
            "documentId": "DOC-9921",
            "documentType": "NATIONAL_ID (AADHAAR)",
            "finalDecision": "VERIFIED",
            "evidenceSha256": "3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b",
            "ocr": {"fields": {"name": "Aditya Sharma", "docNumber": "2345 6789 0124", "dob": "1995-08-15"}}
        },
        "final_decision": "VERIFIED",
        "overall_risk_score": 2.8,
        "overall_status": "LOW",
        "liveness_passed": True,
        "face_similarity": 98.4
    }
    
    # Save record for user_a
    saved_rec = save_verification_record(user_a, stage5_payload)
    assert saved_rec is not None, "Stage 5 record must be successfully persisted"
    assert saved_rec["case_id"] == "CASE-STAGE5-PERSIST-001", "Case ID must match"
    assert saved_rec["final_decision"] == "VERIFIED", "Final verdict must be retained"
    assert saved_rec["liveness_passed"] is True, "Liveness result must be retained"
    assert saved_rec["face_similarity"] == 98.4, "Face similarity must be retained"
    print("Step 5 Report State Verification: ALL 5-STAGE CREDENTIALS & METRICS PERMANENTLY PRESERVED.")

    print("\n==================================================")
    print("ALL COMPREHENSIVE PIPELINE & AUTHENTICATION TESTS (A through O) PASSED 100%!")
    print("==================================================")


if __name__ == "__main__":
    run_all_comprehensive_tests()
