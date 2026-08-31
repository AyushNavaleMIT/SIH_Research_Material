import os
import cv2
import json
import base64
import hashlib
import uuid
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from forensics.preprocessor import preprocess_document_image
from forensics.ocr_engine import extract_document_ocr
from forensics.mrz_engine import extract_and_validate_mrz
from forensics.barcode_engine import detect_and_verify_barcodes
from forensics.analyzer import analyze_document_forensics
from forensics.face_engine import process_face_verification
from forensics.liveness_engine import process_liveness_frame, reset_liveness_session
from forensics.risk_engine import calculate_composite_risk
from forensics.reporting_engine import (
    create_cybercrime_case_payload,
    generate_pdf_case_report,
    compute_sha256,
    generate_case_id
)
from forensics.validation import validate_uploaded_image
from forensics.visualizer import generate_forensic_heatmap
from forensics.auth_engine import (
    register_user,
    login_user,
    get_current_user_from_token,
    logout_user,
    save_verification_record,
    get_user_verification_history,
    get_verification_record_by_id
)

app = FastAPI(
    title="AI Forensic Identity Screening Platform API",
    version="4.5.0",
    description="Full-stack AI identity screening pipeline with Indian document verification, Verhoeff checksums, and Cybercrime incident dossier generation."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure static directories exist & mount static file server
os.makedirs("static/heatmaps", exist_ok=True)
os.makedirs("static/reports", exist_ok=True)
os.makedirs("static/faces", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

_REPORT_CACHE = {}


class FramePayload(BaseModel):
    frame_base64: str
    session_id: Optional[str] = "default"
    challenge_type: Optional[str] = "BLINK_TWICE"


class RiskCalculationPayload(BaseModel):
    doc_forensics: Optional[Dict[str, Any]] = None
    doc_analysis: Optional[Dict[str, Any]] = None
    face_verification: Optional[Dict[str, Any]] = None
    liveness_result: Optional[Dict[str, Any]] = None
    liveness_check: Optional[Dict[str, Any]] = None
    case_id: Optional[str] = None
    applicant_name: Optional[str] = None

    def get_doc_data(self) -> Dict[str, Any]:
        return self.doc_forensics or self.doc_analysis or {}

    def get_liveness_data(self) -> Optional[Dict[str, Any]]:
        return self.liveness_result or self.liveness_check


class RegisterPayload(BaseModel):
    email: str
    password: str
    username: Optional[str] = None
    role: Optional[str] = "INDIVIDUAL"
    full_name: Optional[str] = None
    org_name: Optional[str] = None
    org_id: Optional[str] = None
    org_type: Optional[str] = None
    authorized_person: Optional[str] = None


class LoginPayload(BaseModel):
    email: str
    password: str


def _extract_token(request: Request, authorization: Optional[str] = None) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization.replace("Bearer ", "").strip()
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "").strip()
    return request.query_params.get("token")


@app.get("/")
def health_check():
    return {
        "status": "ONLINE",
        "service": "AI Forensic Identity Screening Platform",
        "version": "4.5.0",
        "features": {
            "authentication": "Multi-tenant Individual & Organisation RBAC with PBKDF2 hashing",
            "quality_gate": "Multi-factor blur, glare, lighting & skew inspection",
            "aadhaar_validation": "12-Digit Verhoeff mathematical algorithm & structural layout verification",
            "pan_validation": "Income Tax PAN structure & entity syntax verification",
            "mrz_validation": "ICAO Doc 9303 TD1/TD2/TD3 travel document check digits",
            "real_ocr": "RapidOCR with character correction and field parsing",
            "qr_barcode": "zxing-cpp multi-pass Aadhaar XML QR decoding and cross-match",
            "forensics_ela": "Error Level Analysis & texture variance multi-signal synthesis",
            "face_verification": "YuNet neural face detector & SFace 128D cosine distance",
            "active_liveness": "Browser-side MediaPipe landmark EAR & temporal blink state machine",
            "composite_risk": "Explainable Bayesian 4-level risk aggregator",
            "cybercrime_reporting": "ReportLab vector PDF & JSON dossier with SHA-256 evidence digests"
        }
    }


# =============================================================================
# AUTHENTICATION & MULTI-TENANT AUDIT HISTORY
# =============================================================================

@app.post("/auth/register")
async def register(payload: RegisterPayload):
    try:
        result = register_user(payload.dict())
        return {"status": "SUCCESS", "data": result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {e}")


@app.post("/auth/login")
async def login(payload: LoginPayload):
    try:
        result = login_user(payload.email, payload.password)
        return {"status": "SUCCESS", "data": result}
    except ValueError as ve:
        raise HTTPException(status_code=401, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {e}")


@app.get("/auth/me")
async def get_me(request: Request, authorization: Optional[str] = Header(None)):
    token = _extract_token(request, authorization)
    user = get_current_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session token.")
    return {"status": "SUCCESS", "user": user}


@app.post("/auth/logout")
async def logout(request: Request, authorization: Optional[str] = Header(None)):
    token = _extract_token(request, authorization)
    if token:
        logout_user(token)
    return {"status": "SUCCESS", "message": "Logged out successfully."}


@app.post("/verifications/record")
async def record_verification(
    request: Request,
    payload: Dict[str, Any] = Body(...),
    authorization: Optional[str] = Header(None)
):
    token = _extract_token(request, authorization)
    user = get_current_user_from_token(token)
    record = save_verification_record(user, payload)
    return {"status": "SAVED", "record": record}


@app.get("/verifications/history")
async def get_history(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    token = _extract_token(request, authorization)
    user = get_current_user_from_token(token)
    # Return user-specific history (strict data isolation)
    history = get_user_verification_history(user)
    return {
        "status": "SUCCESS",
        "count": len(history),
        "owner_id": user.get("id") if user else "ANONYMOUS",
        "history": history
    }


@app.get("/verifications/{case_id}")
async def get_single_verification(
    case_id: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    token = _extract_token(request, authorization)
    user = get_current_user_from_token(token)
    record = get_verification_record_by_id(case_id, user)
    if not record:
        raise HTTPException(status_code=404, detail="Verification record not found or access denied.")
    return {"status": "SUCCESS", "record": record}


# =============================================================================
# DOCUMENT FORENSICS & VERIFICATION
# =============================================================================

@app.post("/forensics/analyze")
async def analyze_document(
    request: Request,
    file: UploadFile = File(...)
):
    bgr_image, raw_bytes, filename, source_info = await validate_uploaded_image(file)
    evidence_sha256 = compute_sha256(raw_bytes)

    preprocessed_data = preprocess_document_image(bgr_image, max_dim=1600, source_info=source_info)
    ocr_result = extract_document_ocr(bgr_image, preprocessed_data)

    mrz_result = extract_and_validate_mrz(
        ocr_lines=[line["text"] for line in ocr_result.get("lines", [])],
        raw_ocr_text=ocr_result.get("raw_text", ""),
        document_type=ocr_result.get("fields", {}).get("document_type", "UNKNOWN")
    )

    barcode_result = detect_and_verify_barcodes(
        bgr_image=bgr_image,
        ocr_fields=ocr_result.get("fields"),
        preprocessed_data=preprocessed_data
    )

    analysis_result = analyze_document_forensics(
        preprocessed_data=preprocessed_data,
        ocr_result=ocr_result,
        mrz_result=mrz_result,
        barcode_result=barcode_result
    )

    heatmap_rel_path = generate_forensic_heatmap(
        preprocessed_data["processed_bgr"],
        analysis_result["ela_map"],
        analysis_result["suspicious_regions"],
        output_dir="static/heatmaps"
    )

    base_url = str(request.base_url).rstrip("/")
    heatmap_url = f"{base_url}{heatmap_rel_path}"

    return {
        "tampering_score": float(analysis_result["tampering_score"]),
        "composite_risk_score": float(analysis_result["composite_risk_score"]),
        "risk_level": analysis_result["risk_level"],
        "final_decision": analysis_result["final_decision"],
        "recapture_required": analysis_result.get("recapture_required", False),
        "quality_gate": analysis_result.get("quality_gate", {}),
        "source_type": source_info.get("source_type", "PHYSICAL_CAMERA_CAPTURE"),
        "source_display": source_info.get("display_name", "Physical Document"),
        "is_digital": source_info.get("is_digital", False),
        "source_info": source_info,
        "evidence_sha256": evidence_sha256,
        "filename": filename,
        "filesize_bytes": len(raw_bytes),
        "suspicious_regions": analysis_result["suspicious_regions"],
        "heatmap_url": heatmap_url,
        "analysis_method": analysis_result["analysis_method"],
        "reasons": analysis_result["reasons"],
        "evidence_signals": analysis_result.get("evidence_signals", {}),
        "ocr": ocr_result,
        "mrz": mrz_result,
        "barcode": barcode_result,
        "aadhaar_validation": ocr_result.get("aadhaar_validation"),
        "pan_validation": ocr_result.get("pan_validation")
    }


@app.post("/face/verify")
async def verify_face(
    request: Request,
    doc_file: UploadFile = File(...),
    selfie_file: UploadFile = File(...)
):
    doc_bgr, doc_bytes, _, _ = await validate_uploaded_image(doc_file)
    selfie_bgr, selfie_bytes, _, _ = await validate_uploaded_image(selfie_file)

    doc_id = hashlib.sha256(doc_bytes).hexdigest()[:12]
    selfie_id = hashlib.sha256(selfie_bytes).hexdigest()[:12]

    result = process_face_verification(
        doc_bgr=doc_bgr,
        selfie_bgr=selfie_bgr,
        doc_id=doc_id,
        selfie_id=selfie_id
    )

    base_url = str(request.base_url).rstrip("/")
    if result.get("document_face_crop_rel"):
        result["document_face_url"] = f"{base_url}{result['document_face_crop_rel']}"
    if result.get("live_selfie_crop_rel"):
        result["live_captured_face_url"] = f"{base_url}{result['live_selfie_crop_rel']}"

    return result


@app.post("/liveness/process-frame")
async def liveness_frame(payload: FramePayload):
    try:
        raw_b64 = payload.frame_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",")[1]
        frame_bytes = base64.b64decode(raw_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 frame data: {e}")

    result = process_liveness_frame(
        frame_bytes=frame_bytes,
        session_id=payload.session_id or "default",
        challenge_type=payload.challenge_type
    )
    return result


@app.post("/liveness/session/reset")
async def reset_liveness(session_id: str = Body(default="default", embed=True)):
    session = reset_liveness_session(session_id)
    return {"status": "SUCCESS", "session": session}


@app.post("/forensics/risk/calculate")
async def calculate_risk(payload: RiskCalculationPayload):
    doc_data = payload.get_doc_data()
    liveness_data = payload.get_liveness_data()

    result = calculate_composite_risk(
        doc_forensics=doc_data,
        face_verification=payload.face_verification,
        liveness_result=liveness_data,
        case_id=payload.case_id,
        applicant_name=payload.applicant_name
    )
    return result


@app.post("/forensics/report/generate")
async def generate_cybercrime_report(
    request: Request,
    payload: Dict[str, Any] = Body(...)
):
    filename = payload.get("filename", "uploaded_document.jpg")
    evidence_sha256 = payload.get("evidence_sha256") or hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()
    case_id = payload.get("case_id") or generate_case_id()
    analyst_notes = payload.get("analyst_notes")

    dummy_bytes = f"EVIDENCE_CONTAINER_{evidence_sha256}".encode()

    case_dossier = create_cybercrime_case_payload(
        evidence_bytes=dummy_bytes,
        document_filename=filename,
        analysis_data=payload,
        case_id=case_id,
        analyst_notes=analyst_notes
    )
    case_dossier["evidence_file"]["sha256_digest"] = evidence_sha256

    pdf_filename = f"report_{case_id}.pdf"
    pdf_path = os.path.join("static/reports", pdf_filename)
    generate_pdf_case_report(case_dossier, output_path=pdf_path)

    json_filename = f"report_{case_id}.json"
    json_path = os.path.join("static/reports", json_filename)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(case_dossier, f, indent=2)

    base_url = str(request.base_url).rstrip("/")
    return {
        "status": "CREATED",
        "case_id": case_id,
        "pdf_download_url": f"{base_url}/forensics/report/pdf/{case_id}",
        "json_download_url": f"{base_url}/forensics/report/json/{case_id}",
        "official_portal": {
            "name": "National Cyber Crime Reporting Portal (MHA)",
            "url": "https://www.cybercrime.gov.in/",
            "helpline": "1930"
        },
        "dossier": case_dossier
    }


@app.get("/forensics/report/pdf/{case_id}")
async def download_pdf_report(case_id: str):
    pdf_filename = f"report_{case_id}.pdf"
    pdf_path = os.path.join("static/reports", pdf_filename)
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF report not found for this case ID.")
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"Cybercrime_Report_{case_id}.pdf"
    )


@app.get("/forensics/report/json/{case_id}")
async def download_json_report(case_id: str):
    json_filename = f"report_{case_id}.json"
    json_path = os.path.join("static/reports", json_filename)
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="JSON report not found for this case ID.")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return JSONResponse(content=data)
