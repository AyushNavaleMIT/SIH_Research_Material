import os
import io
import json
import uuid
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Request, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response

from forensics.validation import validate_uploaded_image
from forensics.preprocessor import preprocess_document_image
from forensics.analyzer import analyze_document_forensics
from forensics.visualizer import generate_forensic_heatmap
from forensics.ocr_engine import extract_document_ocr
from forensics.mrz_engine import extract_and_validate_mrz
from forensics.barcode_engine import detect_and_verify_barcodes
from forensics.reporting_engine import (
    compute_sha256,
    generate_case_id,
    create_cybercrime_case_payload,
    generate_pdf_case_report
)

app = FastAPI(
    title="AI Fake Identity & Document Screening API",
    description="Multi-Modal Forensic Screening Engine: ELA Tamper Detection, Real OCR, ICAO MRZ Checksum Validation, QR/Barcode Verification & Cybercrime Case Reporting",
    version="2.0.0"
)

# Configure CORS Middleware for Frontend Access
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
app.mount("/static", StaticFiles(directory="static"), name="static")

# In-memory store for generated reports cache (persisted to static/reports as well)
_REPORT_CACHE = {}


@app.get("/")
def health_check():
    return {
        "status": "ONLINE",
        "service": "Multi-Modal AI Document Forensics Engine",
        "version": "2.0.0",
        "features": {
            "real_ocr": "RapidOCR ONNX (Local CPU Inference)",
            "mrz_validation": "ICAO Doc 9303 (TD1, TD2, TD3 7-3-1 Weight Checksums)",
            "qr_barcode": "zxing-cpp + OpenCV 2D Scanner",
            "forensics_ela": "Error Level Analysis & Local Texture Anomaly Localization",
            "cybercrime_reporting": "PDF/JSON Generator & Indian Cybercrime Portal Integration (1930 Helpline)"
        },
        "endpoints": [
            "/forensics/analyze",
            "/forensics/report/generate",
            "/forensics/report/pdf/{report_id}",
            "/forensics/report/json/{report_id}"
        ]
    }


@app.post("/forensics/analyze")
async def analyze_document(request: Request, file: UploadFile = File(...)):
    """
    POST /forensics/analyze
    Comprehensive multi-modal processing pipeline:
    1. File & Format Validation + SHA-256 Hash Computation
    2. Image Preprocessing (Blur, Luminance, Contrast, Multi-Scale Grayscale)
    3. Real OCR Field Extraction (RapidOCR)
    4. ICAO MRZ Checksum Verification (TD1, TD2, TD3)
    5. QR / Barcode Decoding & Cross-Verification (zxing-cpp)
    6. ELA Forensic Tamper Detection & Heatmap Generation
    7. Multi-Modal Composite Risk Engine & Explainable Verdict
    """
    # 1. File Validation
    bgr_image, raw_bytes, filename = await validate_uploaded_image(file)
    evidence_sha256 = compute_sha256(raw_bytes)

    # 2. Image Preprocessing
    preprocessed_data = preprocess_document_image(bgr_image, max_dim=1600)

    # 3. Real OCR Field Extraction
    ocr_result = extract_document_ocr(bgr_image, preprocessed_data)

    # 4. Real ICAO MRZ Checksum Validation
    mrz_result = extract_and_validate_mrz(
        ocr_lines=[line["text"] for line in ocr_result.get("lines", [])],
        raw_ocr_text=ocr_result.get("raw_text", "")
    )

    # 5. Real QR & Barcode Detection & Cross-Verification
    barcode_result = detect_and_verify_barcodes(
        bgr_image=bgr_image,
        ocr_fields=ocr_result.get("fields"),
        preprocessed_data=preprocessed_data
    )

    # 6. Forensic Tampering Analysis (ELA + Cross-Modal Weighting)
    analysis_result = analyze_document_forensics(
        preprocessed_data=preprocessed_data,
        ocr_result=ocr_result,
        mrz_result=mrz_result,
        barcode_result=barcode_result
    )

    # 7. Generate Suspicious Region Thermal Heatmap Overlay
    heatmap_rel_path = generate_forensic_heatmap(
        preprocessed_data["processed_bgr"],
        analysis_result["ela_map"],
        analysis_result["suspicious_regions"],
        output_dir="static/heatmaps"
    )

    # Build full absolute URL for heatmap image
    base_url = str(request.base_url).rstrip("/")
    heatmap_url = f"{base_url}{heatmap_rel_path}"

    # Return unified response
    return {
        "tampering_score": float(analysis_result["tampering_score"]),
        "composite_risk_score": float(analysis_result["composite_risk_score"]),
        "risk_level": analysis_result["risk_level"],
        "final_decision": analysis_result["final_decision"],
        "evidence_sha256": evidence_sha256,
        "filename": filename,
        "filesize_bytes": len(raw_bytes),
        "suspicious_regions": analysis_result["suspicious_regions"],
        "heatmap_url": heatmap_url,
        "analysis_method": analysis_result["analysis_method"],
        "reasons": analysis_result["reasons"],
        "ocr": ocr_result,
        "mrz": mrz_result,
        "barcode": barcode_result
    }


@app.post("/forensics/report/generate")
async def generate_cybercrime_report(request: Request, payload: dict = Body(...)):
    """
    POST /forensics/report/generate
    Creates structured JSON dossier and downloadable PDF incident report.
    Includes Indian National Cyber Crime Reporting Portal references (https://www.cybercrime.gov.in/).
    """
    filename = payload.get("filename", "uploaded_document.jpg")
    evidence_sha256 = payload.get("evidence_sha256") or hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()
    case_id = payload.get("case_id") or generate_case_id()
    analyst_notes = payload.get("analyst_notes")

    # Create dummy bytes or use provided hash
    dummy_bytes = f"EVIDENCE_CONTAINER_{evidence_sha256}".encode()

    case_dossier = create_cybercrime_case_payload(
        evidence_bytes=dummy_bytes,
        document_filename=filename,
        analysis_data=payload,
        case_id=case_id,
        analyst_notes=analyst_notes
    )
    # Ensure SHA-256 is accurately preserved
    case_dossier["evidence_file"]["sha256_digest"] = evidence_sha256

    # Generate PDF and save to disk
    pdf_filename = f"report_{case_id}.pdf"
    pdf_path = os.path.join("static/reports", pdf_filename)
    generate_pdf_case_report(case_dossier, output_path=pdf_path)

    # Save JSON dossier to disk
    json_filename = f"report_{case_id}.json"
    json_path = os.path.join("static/reports", json_filename)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(case_dossier, f, indent=2)

    # Build download URLs
    base_url = str(request.base_url).rstrip("/")
    pdf_url = f"{base_url}/forensics/report/pdf/{case_id}"
    json_url = f"{base_url}/forensics/report/json/{case_id}"

    # Cache in memory
    _REPORT_CACHE[case_id] = case_dossier

    return {
        "status": "SUCCESS",
        "case_id": case_id,
        "message": "Cybercrime Case Report generated successfully.",
        "pdf_download_url": pdf_url,
        "json_download_url": json_url,
        "portal_url": "https://www.cybercrime.gov.in/",
        "helpline": "1930",
        "dossier": case_dossier
    }


@app.get("/forensics/report/pdf/{case_id}")
async def download_pdf_report(case_id: str):
    """
    GET /forensics/report/pdf/{case_id}
    Streams downloadable PDF case report file.
    """
    pdf_filename = f"report_{case_id}.pdf"
    pdf_path = os.path.join("static/reports", pdf_filename)

    if not os.path.exists(pdf_path):
        # Generate if cached
        if case_id in _REPORT_CACHE:
            generate_pdf_case_report(_REPORT_CACHE[case_id], output_path=pdf_path)
        else:
            raise HTTPException(status_code=404, detail="Case report PDF not found.")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"Cybercrime_Case_Report_{case_id}.pdf"
    )


@app.get("/forensics/report/json/{case_id}")
async def download_json_report(case_id: str):
    """
    GET /forensics/report/json/{case_id}
    Returns raw JSON case dossier.
    """
    json_filename = f"report_{case_id}.json"
    json_path = os.path.join("static/reports", json_filename)

    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return JSONResponse(content=data)
    elif case_id in _REPORT_CACHE:
        return JSONResponse(content=_REPORT_CACHE[case_id])
    else:
        raise HTTPException(status_code=404, detail="Case report JSON not found.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
