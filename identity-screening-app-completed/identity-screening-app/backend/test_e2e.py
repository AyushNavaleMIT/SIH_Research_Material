import os
import io
import json
import cv2
import numpy as np
from fastapi.testclient import TestClient

# Ensure static directories exist
os.makedirs("static/heatmaps", exist_ok=True)
os.makedirs("static/reports", exist_ok=True)

from main import app

client = TestClient(app)

def create_sample_passport_image():
    """Generates a realistic test passport image with text and ICAO MRZ."""
    img = np.ones((600, 900, 3), dtype=np.uint8) * 245
    
    # Border & layout
    cv2.rectangle(img, (20, 20), (880, 580), (40, 40, 40), 3)
    cv2.rectangle(img, (40, 40), (860, 110), (180, 120, 30), -1)
    cv2.putText(img, "PASSPORT - REPUBLIC OF CYBERIA", (60, 85), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
    
    # Photo box
    cv2.rectangle(img, (50, 140), (230, 380), (80, 80, 80), 2)
    cv2.circle(img, (140, 230), (50), (120, 120, 120), -1)
    
    # Text fields
    cv2.putText(img, "SURNAME: VALENTINE", (270, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(img, "GIVEN NAMES: ALEXANDER JAMES", (270, 215), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(img, "NATIONALITY: CYBERIAN", (270, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 20, 20), 2)
    cv2.putText(img, "DOB: 14 APR 1988", (270, 305), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 20, 20), 2)
    cv2.putText(img, "PASSPORT NO: CY-9842011A", (270, 350), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(img, "EXPIRY: 22 OCT 2031", (550, 350), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 20, 20), 2)
    
    # MRZ Box
    cv2.rectangle(img, (40, 480), (860, 560), (15, 15, 15), -1)
    cv2.putText(img, "P<CYBVALENTINE<<ALEXANDER<JAMES<<<<<<<<<<<<", (50, 515), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 220, 255), 1)
    cv2.putText(img, "CY9842011A4CYB8804148M3110222<<<<<<<<<<<<<<06", (50, 545), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 220, 255), 1)
    
    # Encode as JPEG
    _, encoded = cv2.imencode(".jpg", img)
    return encoded.tobytes()

def create_sample_driver_license_image():
    """Generates a test driver license with a QR code and tampered photo area."""
    img = np.ones((500, 800, 3), dtype=np.uint8) * 240
    
    cv2.rectangle(img, (20, 20), (780, 480), (30, 30, 100), 3)
    cv2.rectangle(img, (40, 40), (760, 100), (30, 50, 160), -1)
    cv2.putText(img, "DRIVER LICENSE - STATE OF PACIFICA", (60, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    
    # Spliced photo box with high noise
    photo_box = np.random.randint(50, 200, (180, 140, 3), dtype=np.uint8)
    img[130:310, 50:190] = photo_box
    cv2.rectangle(img, (50, 130), (190, 310), (0, 0, 220), 2)
    
    # Details
    cv2.putText(img, "NAME: MARCUS V REYES", (220, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (10, 10, 10), 2)
    cv2.putText(img, "DL NO: DL-9938102-X", (220, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (10, 10, 10), 2)
    cv2.putText(img, "DOB: 01/12/1995", (220, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (10, 10, 10), 2)
    cv2.putText(img, "EXPIRY: 12/31/2028", (220, 310), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (10, 10, 10), 2)
    
    # Draw simulated barcode pattern
    cv2.rectangle(img, (550, 150), (740, 350), (255, 255, 255), -1)
    for x in range(560, 730, 6):
        cv2.line(img, (x, 170), (x, 330), (0, 0, 0), np.random.choice([1, 2, 3]))
    cv2.putText(img, "PDF417", (610, 345), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)
    
    _, encoded = cv2.imencode(".jpg", img)
    return encoded.tobytes()

def run_tests():
    print("==================================================")
    print("STARTING FULL END-TO-END INTEGRATION TEST SUITE")
    print("==================================================")

    # 1. Health Check
    print("\n--> Test 1: GET / (Health check)")
    res = client.get("/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    print(f"Service status: {data['status']}, features: {list(data['features'].keys())}")

    # 2. Analyze Passport Image
    print("\n--> Test 2: POST /forensics/analyze (Passport Test)")
    passport_bytes = create_sample_passport_image()
    res = client.post(
        "/forensics/analyze",
        files={"file": ("passport_alexander.jpg", passport_bytes, "image/jpeg")}
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    p_data = res.json()
    print(f"Verdict: {p_data['final_decision']} (Risk: {p_data['composite_risk_score']}%)")
    print(f"SHA-256: {p_data['evidence_sha256']}")
    print(f"Heatmap URL: {p_data['heatmap_url']}")
    print(f"OCR Readable: {p_data['ocr']['is_readable']}, Fields: {p_data['ocr']['fields']}")
    print(f"MRZ Detected: {p_data['mrz']['mrz_detected']}, Status: {p_data['mrz']['status']}")
    print(f"Barcode Status: {p_data['barcode']['status']}")
    assert "evidence_sha256" in p_data, "Missing evidence_sha256"
    assert "ocr" in p_data, "Missing OCR data"
    assert "mrz" in p_data, "Missing MRZ data"
    assert "barcode" in p_data, "Missing Barcode data"

    # 3. Analyze Driver License Image
    print("\n--> Test 3: POST /forensics/analyze (Driver License Test)")
    dl_bytes = create_sample_driver_license_image()
    res = client.post(
        "/forensics/analyze",
        files={"file": ("driver_license_marcus.jpg", dl_bytes, "image/jpeg")}
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    dl_data = res.json()
    print(f"Verdict: {dl_data['final_decision']} (Tamper Score: {dl_data['tampering_score']}%)")
    print(f"MRZ Applicable: {dl_data['mrz']['is_applicable']} (Status: {dl_data['mrz']['status']})")
    print(f"Barcode Status: {dl_data['barcode']['status']}")
    print(f"Anomaly Regions: {len(dl_data['suspicious_regions'])}")

    # 4. Generate Cybercrime Case Report
    print("\n--> Test 4: POST /forensics/report/generate (Cybercrime Report Dossier)")
    report_payload = {
        "case_id": "CYBER-2026-E2E-999",
        "filename": "driver_license_marcus.jpg",
        "evidence_sha256": dl_data["evidence_sha256"],
        "risk_level": dl_data["risk_level"],
        "final_decision": dl_data["final_decision"],
        "tampering_score": dl_data["tampering_score"],
        "composite_risk_score": dl_data["composite_risk_score"],
        "analysis_method": dl_data["analysis_method"],
        "reasons": dl_data["reasons"],
        "suspicious_regions": dl_data["suspicious_regions"],
        "ocr": dl_data["ocr"],
        "mrz": dl_data["mrz"],
        "barcode": dl_data["barcode"],
        "analyst_notes": "Automated E2E validation test case."
    }
    res = client.post("/forensics/report/generate", json=report_payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    rep_data = res.json()
    print(f"Case Report Created: {rep_data['case_id']}")
    print(f"PDF URL: {rep_data['pdf_download_url']}")
    print(f"JSON URL: {rep_data['json_download_url']}")
    print(f"Portal: {rep_data['portal_url']} (Helpline: {rep_data['helpline']})")

    # 5. Download PDF Case Report
    print("\n--> Test 5: GET /forensics/report/pdf/{case_id}")
    pdf_res = client.get(f"/forensics/report/pdf/{rep_data['case_id']}")
    assert pdf_res.status_code == 200, f"Expected 200, got {pdf_res.status_code}"
    assert pdf_res.headers.get("content-type") == "application/pdf"
    print(f"PDF Download Success: {len(pdf_res.content)} bytes received.")

    # 6. Download JSON Case Report
    print("\n--> Test 6: GET /forensics/report/json/{case_id}")
    json_res = client.get(f"/forensics/report/json/{rep_data['case_id']}")
    assert json_res.status_code == 200, f"Expected 200, got {json_res.status_code}"
    json_body = json_res.json()
    print(f"JSON Download Success: Case ID {json_body['case_id']}, Hash: {json_body['evidence_file']['sha256_digest']}")
    assert json_body["submission_portal"]["official_url"] == "https://www.cybercrime.gov.in/"
    assert json_body["submission_portal"]["national_helpline"] == "1930 (Toll-Free 24x7)"

    print("\n==================================================")
    print("ALL 6 END-TO-END TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
