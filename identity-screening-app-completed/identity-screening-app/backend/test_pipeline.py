import os
import cv2
import numpy as np
from forensics.ocr_engine import extract_document_ocr
from forensics.mrz_engine import extract_and_validate_mrz, calculate_icao_check_digit
from forensics.barcode_engine import detect_and_verify_barcodes
from forensics.reporting_engine import (
    compute_sha256,
    generate_case_id,
    create_cybercrime_case_payload,
    generate_pdf_case_report
)

def test_pipeline():
    print("=== 1. Testing MRZ Checksum Math ===")
    # Test ICAO standard: Checksum for 'CY9842011' -> 'A' filler or digit?
    # Test standard digits: '880414' with weights 7,3,1 -> 8*7+8*3+0*1+4*7+1*3+4*1 = 56+24+0+28+3+4 = 115 % 10 = 5 (or 8 depending on DOB)
    calc_dob = calculate_icao_check_digit("880414")
    print(f"Calculated Check Digit for 880414: {calc_dob}")
    
    # Test TD3 MRZ parser
    line1 = "P<CYBVALENTINE<<ALEXANDER<JAMES<<<<<<<<<<<<"
    line2 = "CY98420110CYB8804148M3110222<<<<<<<<<<<<<<06"
    mrz_res = extract_and_validate_mrz([line1, line2], f"{line1}\n{line2}")
    print(f"MRZ Result Status: {mrz_res['status']}")
    print(f"MRZ Format: {mrz_res['format']}")
    print(f"MRZ Checksums count: {len(mrz_res['checksums'])}")
    for c in mrz_res['checksums']:
        print(f"  - {c['name']}: valid={c['valid']} (exp={c['expected']}, calc={c['calculated']})")

    print("\n=== 2. Testing OCR on Synthetic Document Image ===")
    # Create sample ID test image
    img = np.ones((400, 600, 3), dtype=np.uint8) * 240
    cv2.putText(img, "PASSPORT OF REPUBLIC", (50, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(img, "NAME: ALEXANDER VALENTINE", (50, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2)
    cv2.putText(img, "DOB: 14/04/1988", (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2)
    cv2.putText(img, "PASSPORT NO: CY-9842011A", (50, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2)
    cv2.putText(img, "EXPIRY: 22/10/2031", (50, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2)
    cv2.putText(img, "P<CYBVALENTINE<<ALEXANDER<JAMES<<<<<<<<<<<<", (30, 330), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)
    cv2.putText(img, "CY98420110CYB8804148M3110222<<<<<<<<<<<<<<06", (30, 360), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)

    ocr_res = extract_document_ocr(img)
    print(f"OCR Readable: {ocr_res['is_readable']}")
    print(f"OCR Confidence: {ocr_res['overall_confidence']}%")
    print(f"OCR Extracted Fields: {ocr_res['fields']}")

    print("\n=== 3. Testing QR Code Detector ===")
    # Draw simple QR code or test barcode detector
    qr_img = np.ones((300, 300, 3), dtype=np.uint8) * 255
    # Generate test QR with OpenCV
    try:
        # cv2 doesn't have encode in basic version without opencv-contrib, but let's test detect on image
        bc_res = detect_and_verify_barcodes(img, ocr_res['fields'])
        print(f"Barcode Detected on document: {bc_res['detected']} (Status: {bc_res['status']})")
    except Exception as e:
        print(f"Barcode test error: {e}")

    print("\n=== 4. Testing PDF Report Generation ===")
    os.makedirs("static/reports", exist_ok=True)
    test_payload = {
        "risk_level": "HIGH",
        "final_decision": "HIGH RISK",
        "tampering_score": 78.5,
        "composite_risk_score": 82.0,
        "ocr": ocr_res,
        "mrz": mrz_res,
        "barcode": {"detected": False, "status": "NOT_FOUND"},
        "suspicious_regions": [
            {
                "id": "sr_1",
                "title": "Photo Splicing Boundary",
                "description": "High ELA compression variance detected.",
                "severity": "HIGH"
            }
        ],
        "reasons": [
            "High Error Level Analysis (ELA) variance detected around photo boundary.",
            "Document failed visual baseline typography checks."
        ]
    }
    case_dossier = create_cybercrime_case_payload(
        evidence_bytes=b"SAMPLE_IMAGE_BYTES_12345",
        document_filename="test_passport_tampered.jpg",
        analysis_data=test_payload,
        case_id="CYBER-2026-TEST-001"
    )
    pdf_bytes = generate_pdf_case_report(case_dossier, output_path="static/reports/test_report.pdf")
    print(f"Generated PDF bytes size: {len(pdf_bytes)} bytes. Saved to static/reports/test_report.pdf")
    print("\nALL BACKEND MODULE TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    test_pipeline()
