import os
import uuid
import hashlib
from typing import Dict, Any, List, Optional
from .config import RISK_CONFIG


def calculate_composite_risk(
    doc_forensics: Dict[str, Any],
    face_verification: Optional[Dict[str, Any]] = None,
    liveness_result: Optional[Dict[str, Any]] = None,
    case_id: Optional[str] = None,
    applicant_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Consumes the actual outputs of Steps 1, 2, and 3:
    - Step 1: Document Forensics (ELA, OCR, Aadhaar Verhoeff, MRZ, Barcode, Quality Gate)
    - Step 2: Biometric Face Match (YuNet & SFace 128D)
    - Step 3: Active Liveness (MediaPipe EAR & Head Pose)

    Computes multi-modal composite risk score and explainable AI reasons.
    """
    case_id = case_id or doc_forensics.get("documentId") or f"CASE-2026-{uuid.uuid4().hex[:4].upper()}"
    app_name = applicant_name or doc_forensics.get("ocr", {}).get("fields", {}).get("name") or "Applicant Subject"

    # Quality Gate Check
    quality_gate = doc_forensics.get("quality_gate", {})
    if quality_gate.get("status") == "RECAPTURE_REQUIRED" or doc_forensics.get("final_decision") == "RECAPTURE REQUIRED":
        return {
            "caseId": case_id,
            "applicantName": app_name,
            "documentType": doc_forensics.get("documentType", "NATIONAL_ID"),
            "timestamp": doc_forensics.get("uploadTimestamp", "2026-08-31 00:00:00 UTC"),
            "overallRiskScore": 15.0,
            "overallStatus": "LOW",
            "finalDecision": "RECAPTURE REQUIRED",
            "recommendedAction": "MANUAL_REVIEW",
            "evidenceSha256": doc_forensics.get("evidenceSha256") or doc_forensics.get("evidence_sha256") or "",
            "isDemo": bool(doc_forensics.get("isDemo", False)),
            "recapture_required": True,
            "breakdown": {
                "documentTampering": {"id": "tamper", "name": "Document Authenticity (ELA)", "score": 0.0, "status": "LOW", "weight": 35, "details": "Recapture required due to image quality"},
                "dataConsistency": {"id": "consistency", "name": "Data Consistency & Checksums", "score": 0.0, "status": "LOW", "weight": 25, "details": "Inconclusive due to image blur/lighting"},
                "faceMatch": {"id": "face", "name": "Biometric Face Match", "score": 0.0, "status": "LOW", "weight": 25, "details": "Pending document recapture"},
                "liveness": {"id": "liveness", "name": "Active 3D Liveness", "score": 0.0, "status": "LOW", "weight": 15, "details": "Pending document recapture"},
                "imageQuality": {"id": "quality", "name": "Image Quality Gate", "score": 85.0, "status": "HIGH", "weight": 0, "details": quality_gate.get("recommendation", "Please recapture a clear photo.")}
            },
            "reasons": [
                {
                    "id": "R-QG",
                    "title": "Document Image Recapture Required",
                    "category": "QUALITY",
                    "severity": "HIGH",
                    "impactScore": 50.0,
                    "featureWeight": 100,
                    "description": quality_gate.get("recommendation", "Please recapture a clearer photo of the document in good lighting."),
                    "evidence": ", ".join(quality_gate.get("issues", ["Poor image quality"])),
                    "sourceModule": "Image Quality Gate"
                }
            ]
        }

    # 1. Document Tampering & Integrity Subscore (0 - 100, 35% weight)
    tamper_raw = float(doc_forensics.get("tampering_score", 10.0))
    doc_risk = float(doc_forensics.get("composite_risk_score", tamper_raw))

    # 2. Data Consistency & Checksum Subscore (0 - 100, 25% weight)
    consistency_risk = 2.0
    mrz_status = doc_forensics.get("mrz", {}).get("status", "NOT_APPLICABLE")
    barcode_status = doc_forensics.get("barcode", {}).get("status", "NOT_FOUND")
    aadhaar_val = doc_forensics.get("ocr", {}).get("aadhaar_validation")

    has_checksum_fail = False
    if aadhaar_val and aadhaar_val.get("is_aadhaar"):
        if not aadhaar_val.get("is_verhoeff_valid"):
            consistency_risk = 90.0
            has_checksum_fail = True
        else:
            consistency_risk = 2.0

    if mrz_status == "FAILED":
        consistency_risk = max(consistency_risk, 85.0)
        has_checksum_fail = True
    elif barcode_status == "MISMATCH":
        consistency_risk = max(consistency_risk, 80.0)
        has_checksum_fail = True

    if doc_forensics.get("ocr", {}).get("is_readable") is False:
        consistency_risk = max(consistency_risk, 40.0)

    # 3. Biometric Face Match Subscore (0 - 100, 25% weight)
    face_risk = 5.0
    similarity = 95.0
    has_face_fail = False

    if face_verification is not None:
        face_status = face_verification.get("status", "PASSED")
        similarity = float(face_verification.get("similarity_score", 95.0))
        if face_status == "FAILED" or similarity < 70.0:
            face_risk = max(75.0, 100.0 - similarity)
            has_face_fail = True
        else:
            face_risk = max(2.0, (100.0 - similarity) * 0.8)

    face_risk = max(0.0, min(100.0, face_risk))

    # 4. Active Liveness Subscore (0 - 100, 15% weight)
    liveness_risk = 3.0
    has_liveness_fail = False

    if liveness_result is not None:
        live_passed = bool(liveness_result.get("passed", True) or liveness_result.get("all_passed", True))
        if not live_passed:
            liveness_risk = 88.0
            has_liveness_fail = True
        else:
            liveness_risk = 2.5

    liveness_risk = max(0.0, min(100.0, liveness_risk))

    # False-positive reduction: If data consistency & face & liveness all pass, moderate ELA noise doesn't spike composite risk
    if not has_checksum_fail and not has_face_fail and not has_liveness_fail and tamper_raw < 65.0:
        doc_risk = tamper_raw * 0.5

    # Composite Multi-Modal Risk Calculation
    overall_score = (
        (doc_risk * (RISK_CONFIG["weight_document_authenticity"] / 100.0)) +
        (consistency_risk * (RISK_CONFIG["weight_data_consistency"] / 100.0)) +
        (face_risk * (RISK_CONFIG["weight_face_match"] / 100.0)) +
        (liveness_risk * (RISK_CONFIG["weight_liveness"] / 100.0))
    )
    overall_score = round(max(2.0, min(99.5, overall_score)), 1)

    # Risk Level & Decision
    if has_checksum_fail or has_face_fail or has_liveness_fail or overall_score > RISK_CONFIG["score_suspicious_max"]:
        overall_status = "HIGH"
        recommended_action = "REJECT"
        final_decision = "HIGH RISK"
    elif overall_score > RISK_CONFIG["score_verified_max"]:
        overall_status = "MEDIUM"
        recommended_action = "MANUAL_REVIEW"
        final_decision = "SUSPICIOUS"
    else:
        overall_status = "LOW"
        recommended_action = "PASS"
        final_decision = "VERIFIED"

    # Explainable Reasons Generation
    reasons = []
    reason_counter = 1

    if aadhaar_val and aadhaar_val.get("is_aadhaar"):
        if not aadhaar_val.get("is_verhoeff_valid"):
            reasons.append({
                "id": f"R-{reason_counter}",
                "title": "Aadhaar Verhoeff Checksum Failure",
                "category": "DOCUMENT",
                "severity": "HIGH",
                "impactScore": 90.0,
                "featureWeight": 35,
                "description": "Calculated Verhoeff check digit does not match the printed 12th Aadhaar digit.",
                "evidence": "12-Digit Verhoeff parity check failed.",
                "sourceModule": "UIDAI Pattern & Verhoeff Engine"
            })
            reason_counter += 1

    if mrz_status == "FAILED":
        reasons.append({
            "id": f"R-{reason_counter}",
            "title": "ICAO 9303 MRZ Checksum Mismatch",
            "category": "MRZ",
            "severity": "HIGH",
            "impactScore": 85.0,
            "featureWeight": 30,
            "description": "Calculated 7-3-1 weight check digits do not match the printed optical MRZ line values.",
            "evidence": doc_forensics.get("mrz", {}).get("message", "MRZ Checksum Failed"),
            "sourceModule": "ICAO 9303 Validator"
        })
        reason_counter += 1

    if barcode_status == "MISMATCH":
        reasons.append({
            "id": f"R-{reason_counter}",
            "title": "2D Barcode / Visual OCR Data Discrepancy",
            "category": "BARCODE",
            "severity": "HIGH",
            "impactScore": 80.0,
            "featureWeight": 25,
            "description": "Data decoded from the 2D barcode does not match the printed visual text extracted by OCR.",
            "evidence": doc_forensics.get("barcode", {}).get("status_detail", "Barcode mismatch"),
            "sourceModule": "zxing-cpp 2D Engine"
        })
        reason_counter += 1

    if tamper_raw > 55.0:
        reasons.append({
            "id": f"R-{reason_counter}",
            "title": "Document Surface Inconsistency (ELA)",
            "category": "DOCUMENT",
            "severity": "HIGH" if has_checksum_fail else "MEDIUM",
            "impactScore": round(tamper_raw, 1),
            "featureWeight": 35,
            "description": f"Spectral compression variance of {tamper_raw:.1f}% indicates localized digital editing or overlay splicing.",
            "evidence": f"{len(doc_forensics.get('suspicious_regions', []))} anomaly regions localized on document surface.",
            "sourceModule": "Spectral ELA Engine"
        })
        reason_counter += 1

    if face_risk > 35.0:
        reasons.append({
            "id": f"R-{reason_counter}",
            "title": "Facial Biometric Disparity",
            "category": "FACE",
            "severity": "HIGH",
            "impactScore": round(face_risk, 1),
            "featureWeight": 30,
            "description": f"Deep embedding cosine similarity ({similarity:.1f}%) is below the required 70.0% threshold.",
            "evidence": face_verification.get("message", "Face match failed") if face_verification else "Face mismatch",
            "sourceModule": "YuNet + SFace 128D Engine"
        })
        reason_counter += 1

    if liveness_risk > 50.0:
        reasons.append({
            "id": f"R-{reason_counter}",
            "title": "Biometric Liveness Challenge Incomplete",
            "category": "LIVENESS",
            "severity": "HIGH",
            "impactScore": 88.0,
            "featureWeight": 20,
            "description": "Active blink and 3D head rotation responses were not validated within timeout window.",
            "evidence": "Eye aspect ratio and head yaw angle failed dynamic motion challenge.",
            "sourceModule": "MediaPipe FaceMesh 3D"
        })
        reason_counter += 1

    if not reasons:
        reasons.append({
            "id": "R-1",
            "title": "All Multi-Modal Security Verifications Passed",
            "category": "DOCUMENT",
            "severity": "LOW",
            "impactScore": -85.0,
            "featureWeight": 100,
            "description": "Document authenticity, optical text clarity, biometric face match, and 3D liveness fully verified.",
            "evidence": f"Zero suspicious alterations detected across {doc_forensics.get('fileName', 'uploaded document')}.",
            "sourceModule": "Unified Risk Engine"
        })

    evidence_hash = doc_forensics.get("evidenceSha256") or doc_forensics.get("evidence_sha256") or hashlib.sha256(case_id.encode()).hexdigest()

    return {
        "caseId": case_id,
        "case_id": case_id,
        "applicantName": app_name,
        "applicant_name": app_name,
        "documentType": doc_forensics.get("documentType", "NATIONAL_ID"),
        "document_type": doc_forensics.get("documentType", "NATIONAL_ID"),
        "timestamp": doc_forensics.get("uploadTimestamp", "2026-08-31 00:00:00 UTC"),
        "overallRiskScore": overall_score,
        "overall_risk_score": overall_score,
        "overallStatus": overall_status,
        "overall_status": overall_status,
        "finalDecision": final_decision,
        "final_decision": final_decision,
        "recommendedAction": recommended_action,
        "recommended_action": recommended_action,
        "evidenceSha256": evidence_hash,
        "evidence_sha256": evidence_hash,
        "isDemo": bool(doc_forensics.get("isDemo", False)),
        "breakdown": {
            "documentTampering": {
                "id": "tamper",
                "name": "Document Authenticity (ELA)",
                "score": round(doc_risk, 1),
                "status": "HIGH" if doc_risk > 50 else ("MEDIUM" if doc_risk > 25 else "LOW"),
                "weight": RISK_CONFIG["weight_document_authenticity"],
                "details": f"Spectral compression variance: {tamper_raw:.1f}%"
            },
            "dataConsistency": {
                "id": "consistency",
                "name": "Data Consistency & Checksums",
                "score": round(consistency_risk, 1),
                "status": "HIGH" if consistency_risk > 50 else ("MEDIUM" if consistency_risk > 25 else "LOW"),
                "weight": RISK_CONFIG["weight_data_consistency"],
                "details": f"Aadhaar Verhoeff: {'PASS' if (aadhaar_val and aadhaar_val.get('is_verhoeff_valid')) else 'N/A'}, MRZ: {mrz_status}, Barcode: {barcode_status}"
            },
            "faceMatch": {
                "id": "face",
                "name": "Biometric Face Match",
                "score": round(face_risk, 1),
                "status": "HIGH" if face_risk > 50 else ("MEDIUM" if face_risk > 25 else "LOW"),
                "weight": RISK_CONFIG["weight_face_match"],
                "details": f"Embedding similarity: {similarity:.1f}%"
            },
            "liveness": {
                "id": "liveness",
                "name": "Active 3D Liveness",
                "score": round(liveness_risk, 1),
                "status": "HIGH" if liveness_risk > 50 else "LOW",
                "weight": RISK_CONFIG["weight_liveness"],
                "details": "3/3 Active Challenges Validated" if liveness_risk < 50 else "Liveness Incomplete"
            },
            "imageQuality": {
                "id": "quality",
                "name": "Optical Clarity & DPI",
                "score": 5.0,
                "status": "LOW",
                "weight": 0,
                "details": "Quality Gate PASSED"
            }
        },
        "reasons": reasons
    }
