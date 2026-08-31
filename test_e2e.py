import os
import io
import json
import base64
import cv2
import numpy as np
from fastapi.testclient import TestClient
from forensics.mrz_engine import calculate_icao_check_digit
from forensics.ocr_engine import calculate_verhoeff_check_digit
from pypdf import PdfWriter

# Ensure static directories exist
os.makedirs("static/heatmaps", exist_ok=True)
os.makedirs("static/reports", exist_ok=True)
os.makedirs("static/faces", exist_ok=True)

from main import app

client = TestClient(app)


def create_sample_passport_image():
    """Generates a test passport image with valid text and ICAO MRZ check digits."""
    img = np.ones((600, 900, 3), dtype=np.uint8) * 245
    cv2.rectangle(img, (20, 20), (880, 580), (40, 40, 40), 3)
    cv2.rectangle(img, (40, 40), (860, 110), (180, 120, 30), -1)
    cv2.putText(img, "PASSPORT - REPUBLIC OF CYBERIA", (60, 85), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
    
    cv2.rectangle(img, (50, 140), (230, 380), (80, 80, 80), 2)
    cv2.circle(img, (140, 230), 50, (120, 120, 120), -1)
    
    cv2.putText(img, "SURNAME: VALENTINE", (270, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(img, "GIVEN NAMES: ALEXANDER JAMES", (270, 215), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(img, "NATIONALITY: CYBERIAN", (270, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 20, 20), 2)
    cv2.putText(img, "DOB: 14 APR 1988", (270, 305), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 20, 20), 2)
    cv2.putText(img, "PASSPORT NO: CY9842011", (270, 350), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(img, "EXPIRY: 22 OCT 2031", (550, 350), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 20, 20), 2)
    
    cv2.rectangle(img, (40, 480), (860, 560), (15, 15, 15), -1)
    
    # Calculate ICAO check digits
    p_num = "CY9842011"
    cd_p = calculate_icao_check_digit(p_num)
    cd_dob = calculate_icao_check_digit("880414")
    cd_exp = calculate_icao_check_digit("311022")
    
    line1 = "P<CYBVALENTINE<<ALEXANDER<JAMES<<<<<<<<<<<<"
    line2 = f"{p_num}{cd_p}CYB880414{cd_dob}M311022{cd_exp}<<<<<<<<<<<<<<06"
    comp_data = line2[0:10] + line2[13:20] + line2[21:43]
    cd_comp = calculate_icao_check_digit(comp_data)
    line2 = f"{p_num}{cd_p}CYB880414{cd_dob}M311022{cd_exp}<<<<<<<<<<<<<<{cd_comp:02d}"

    cv2.putText(img, line1, (50, 515), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 220, 255), 1)
    cv2.putText(img, line2, (50, 545), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 220, 255), 1)
    
    _, encoded = cv2.imencode(".jpg", img)
    return encoded.tobytes()


def create_sample_aadhaar_image():
    """Generates a test Aadhaar image with valid Verhoeff number and Indian headers."""
    base_11 = "23456789012"
    check_digit = calculate_verhoeff_check_digit(base_11)
    full_aadhaar = f"{base_11}{check_digit}"

    img = np.ones((500, 800, 3), dtype=np.uint8) * 240
    cv2.rectangle(img, (20, 20), (780, 480), (30, 30, 30), 2)
    cv2.rectangle(img, (30, 30), (770, 90), (0, 100, 200), -1)
    cv2.putText(img, "GOVERNMENT OF INDIA", (50, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
    cv2.putText(img, "MERA AADHAAR, MERI PEHCHAAN", (50, 82), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1)

    # Portrait photo box
    cv2.rectangle(img, (45, 120), (195, 310), (80, 80, 80), 2)
    cv2.circle(img, (120, 190), 40, (140, 140, 140), -1)

    cv2.putText(img, "NAME: ADITYA SHARMA", (220, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (10, 10, 10), 2)
    cv2.putText(img, "DOB: 15/08/1998", (220, 195), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (10, 10, 10), 2)
    cv2.putText(img, "GENDER: MALE", (220, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (10, 10, 10), 2)
    cv2.putText(img, f"AADHAAR NO: {full_aadhaar[:4]} {full_aadhaar[4:8]} {full_aadhaar[8:]}", (220, 290), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(img, "Sector 62, Noida, Uttar Pradesh - 201301", (220, 335), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)

    _, encoded = cv2.imencode(".jpg", img)
    return encoded.tobytes()


def create_sample_eaadhaar_pdf():
    """Generates an authentic test e-Aadhaar PDF in memory."""
    writer = PdfWriter()
    page = writer.add_blank_page(width=595, height=842)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def create_blurry_test_image():
    """Generates an excessively blurry test image to test Quality Gate."""
    img = np.ones((500, 800, 3), dtype=np.uint8) * 200
    cv2.putText(img, "BLURRY TEXT", (100, 200), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (20, 20, 20), 2)
    blurred = cv2.GaussianBlur(img, (55, 55), 0)
    _, encoded = cv2.imencode(".jpg", blurred)
    return encoded.tobytes()


def run_tests():
    print("==================================================")
    print("STARTING FULL END-TO-END INTEGRATION TEST SUITE (v6.0 - AUTH & E-DOC)")
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
    print(f"Passport Verdict: {p_data['final_decision']} (Risk: {p_data['composite_risk_score']}%)")
    assert p_data['final_decision'] in ["VERIFIED", "SUSPICIOUS"], f"Passport verdict: {p_data['final_decision']}"

    # 3. Analyze Physical Aadhaar Image
    print("\n--> Test 3: POST /forensics/analyze (Aadhaar Test)")
    aadhaar_bytes = create_sample_aadhaar_image()
    res = client.post(
        "/forensics/analyze",
        files={"file": ("aadhaar_aditya.jpg", aadhaar_bytes, "image/jpeg")}
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    aadhaar_data = res.json()
    print(f"Aadhaar Verdict: {aadhaar_data['final_decision']} (Source: {aadhaar_data.get('source_display', 'Physical')})")
    assert aadhaar_data['final_decision'] == "VERIFIED", f"Genuine Aadhaar should be VERIFIED, got {aadhaar_data['final_decision']}"
    assert aadhaar_data['mrz']['is_applicable'] is False, "MRZ must NOT be applicable on Aadhaar"

    # 4. Analyze e-Aadhaar PDF Document
    print("\n--> Test 4: POST /forensics/analyze (Official e-Aadhaar PDF Test)")
    pdf_bytes = create_sample_eaadhaar_pdf()
    res = client.post(
        "/forensics/analyze",
        files={"file": ("eaadhaar_uidai.pdf", pdf_bytes, "application/pdf")}
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    pdf_data = res.json()
    print(f"PDF Source Detected: {pdf_data['source_type']} ({pdf_data['source_display']})")
    print(f"Quality Gate Status: {pdf_data['quality_gate']['status']}, Glare Applicable: {pdf_data['quality_gate']['metrics'].get('glare_applicable')}")
    assert pdf_data['is_digital'] is True, "PDF must be flagged as digital"
    assert pdf_data['quality_gate']['metrics']['glare_applicable'] is False, "Camera glare must be NOT APPLICABLE on PDF"
    assert pdf_data['quality_gate']['status'] == "PASSED", "PDF Quality gate must pass"

    # 5. Analyze Blurry Physical Image
    print("\n--> Test 5: POST /forensics/analyze (Quality Gate Blurry Test)")
    blurry_bytes = create_blurry_test_image()
    res = client.post(
        "/forensics/analyze",
        files={"file": ("blurry_sample.jpg", blurry_bytes, "image/jpeg")}
    )
    assert res.status_code == 200
    blurry_data = res.json()
    print(f"Blurry Verdict: {blurry_data['final_decision']} (Recapture Required: {blurry_data['recapture_required']})")
    assert blurry_data['final_decision'] == "RECAPTURE REQUIRED"

    # 6. Biometric Face Match
    print("\n--> Test 6: POST /face/verify (Biometric Face Match)")
    res = client.post(
        "/face/verify",
        files={
            "doc_file": ("aadhaar.jpg", aadhaar_bytes, "image/jpeg"),
            "selfie_file": ("selfie.jpg", aadhaar_bytes, "image/jpeg")
        }
    )
    assert res.status_code == 200
    face_data = res.json()
    print(f"Face Verification Match: {face_data.get('status')}, Similarity: {face_data.get('similarityScore')}%")

    # 7. Liveness Frame Processing
    print("\n--> Test 7: POST /liveness/process-frame (Liveness Frame Processing)")
    blank_frame = np.zeros((240, 320, 3), dtype=np.uint8)
    _, b_encoded = cv2.imencode(".jpg", blank_frame)
    b64_frame = "data:image/jpeg;base64," + base64.b64encode(b_encoded.tobytes()).decode("utf-8")
    res = client.post(
        "/liveness/process-frame",
        json={"frame_base64": b64_frame, "session_id": "test_sess", "challenge_type": "BLINK_TWICE"}
    )
    assert res.status_code == 200
    live_data = res.json()
    print(f"Liveness Frame Result: Success={live_data['success']}, FaceDetected={live_data['face_detected']}")

    # 8. Multi-Modal Risk Engine
    print("\n--> Test 8: POST /forensics/risk/calculate (Composite Multi-Modal Risk Engine)")
    res = client.post(
        "/forensics/risk/calculate",
        json={
            "doc_analysis": aadhaar_data,
            "face_verification": {"status": "PASSED", "similarityScore": 91.5},
            "liveness_check": {"passed": True}
        }
    )
    assert res.status_code == 200
    risk_data = res.json()
    print(f"Overall Risk Score: {risk_data['overallRiskScore']} / 100 ({risk_data['overallStatus']})")
    print(f"Final Decision: {risk_data['finalDecision']}, Action: {risk_data['recommendedAction']}")
    assert risk_data['finalDecision'] == "VERIFIED"

    # 9. Cybercrime Report Dossier
    print("\n--> Test 9: POST /forensics/report/generate (Cybercrime Report Dossier)")
    res = client.post(
        "/forensics/report/generate",
        json={"doc_analysis": aadhaar_data, "risk_decision": risk_data}
    )
    assert res.status_code == 200
    rep_data = res.json()
    print(f"Case Report Created: {rep_data['case_id']}")
    print(f"PDF URL: {rep_data['pdf_download_url']}")
    print(f"Portal: {rep_data['official_portal']['url']} (Helpline: {rep_data['official_portal']['helpline']})")

    # 10. Report Downloads (PDF & JSON)
    print("\n--> Test 10: GET /forensics/report/pdf and /json")
    pdf_res = client.get(f"/forensics/report/pdf/{rep_data['case_id']}")
    assert pdf_res.status_code == 200
    assert len(pdf_res.content) > 1000
    print(f"PDF Download Success: {len(pdf_res.content)} bytes received.")

    json_res = client.get(f"/forensics/report/json/{rep_data['case_id']}")
    assert json_res.status_code == 200
    print(f"JSON Download Success: Case ID {json_res.json()['case_id']}")

    # 11. Authentication Endpoints (Individual & Organisation)
    print("\n--> Test 11: POST /auth/register and /auth/login")
    reg_res = client.post("/auth/register", json={
        "email": "e2e_tester@bankcorp.com",
        "password": "E2ePassword123!",
        "role": "ORGANISATION",
        "org_name": "E2E Test Bank",
        "org_type": "BANK",
        "authorized_person": "E2E Officer"
    })
    assert reg_res.status_code in [200, 400]  # May already exist in test run
    
    login_res = client.post("/auth/login", json={
        "email": "e2e_tester@bankcorp.com",
        "password": "E2ePassword123!"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["data"]["token"]
    user_info = login_res.json()["data"]["user"]
    print(f"Auth Success: User={user_info['email']}, Role={user_info['role']}, Token={token[:12]}...")

    # 12. Authenticated Profile Inspection (/auth/me)
    print("\n--> Test 12: GET /auth/me")
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["user"]["email"] == "e2e_tester@bankcorp.com"
    print(f"Session Profile Validated: {me_res.json()['user']['org_name']}")

    # 13. Verification Audit Recording (/verifications/record & /verifications/history)
    print("\n--> Test 13: POST /verifications/record & GET /verifications/history")
    rec_save = client.post(
        "/verifications/record",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "case_id": "CASE-E2E-999",
            "applicant_name": "E2E Test Subject",
            "doc_data": aadhaar_data,
            "final_decision": "VERIFIED",
            "overall_risk_score": 4.2
        }
    )
    assert rec_save.status_code == 200

    hist_res = client.get("/verifications/history", headers={"Authorization": f"Bearer {token}"})
    assert hist_res.status_code == 200
    history_items = hist_res.json()["history"]
    print(f"Tenant History Count: {len(history_items)} (IDs: {[r['case_id'] for r in history_items]})")
    assert any(r["case_id"] == "CASE-E2E-999" for r in history_items)

    print("\n==================================================")
    print("ALL 13 END-TO-END INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
