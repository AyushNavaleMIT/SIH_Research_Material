import os
import io
import json
import time
import re
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)


def compute_sha256(raw_bytes: bytes) -> str:
    """Computes standard SHA-256 hex digest for forensic chain-of-custody evidence integrity."""
    return hashlib.sha256(raw_bytes).hexdigest()


def generate_case_id(prefix: str = "CYBER") -> str:
    """Generates unique standardized case report identifier."""
    now_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    unique_suffix = hashlib.md5(str(time.time_ns()).encode()).hexdigest()[:6].upper()
    return f"{prefix}-{now_str}-{unique_suffix}"


def mask_sensitive_id(doc_number: Optional[str]) -> str:
    """Masks middle characters of sensitive national IDs (e.g. Aadhaar)."""
    if not doc_number:
        return "N/A"
    clean = re.sub(r'\s+', '', str(doc_number))
    if len(clean) == 12 and clean.isdigit():
        return f"XXXX-XXXX-{clean[-4:]}"
    elif len(clean) > 6:
        return f"{clean[:2]}***{clean[-4:]}"
    return doc_number


def create_cybercrime_case_payload(
    evidence_bytes: bytes,
    document_filename: str,
    analysis_data: Dict[str, Any],
    case_id: Optional[str] = None,
    analyst_notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Constructs a structured JSON dossier for cybercrime incident reporting.
    Prepares evidence for human review and official submission to the Indian National Cyber Crime Reporting Portal.
    """
    cid = case_id or generate_case_id()
    now_iso = datetime.now(timezone.utc).isoformat()
    sha256_hash = compute_sha256(evidence_bytes)

    risk_level = analysis_data.get("risk_level", "SUSPICIOUS")
    tampering_score = analysis_data.get("tampering_score", 0.0)
    composite_risk_score = analysis_data.get("composite_risk_score", tampering_score)
    final_decision = analysis_data.get("final_decision", "SUSPICIOUS")

    ocr_data = analysis_data.get("ocr", {})
    mrz_data = analysis_data.get("mrz", {})
    barcode_data = analysis_data.get("barcode", {})
    suspicious_regions = analysis_data.get("suspicious_regions", [])
    reasons = analysis_data.get("reasons", [])
    quality_gate = analysis_data.get("quality_gate", {})
    aadhaar_val = ocr_data.get("aadhaar_validation") if isinstance(ocr_data, dict) else None

    raw_doc_num = ocr_data.get("fields", {}).get("doc_number") if isinstance(ocr_data, dict) else None
    masked_num = mask_sensitive_id(raw_doc_num)

    return {
        "case_id": cid,
        "report_title": "AI FORENSIC IDENTITY SCREENING & CYBERCRIME INCIDENT DOSSIER",
        "generated_timestamp": now_iso,
        "submission_portal": {
            "name": "Indian National Cyber Crime Reporting Portal (Ministry of Home Affairs)",
            "official_url": "https://www.cybercrime.gov.in/",
            "national_helpline": "1930 (Toll-Free 24x7)",
            "jurisdiction": "National Cyber Crime Reporting Portal / Central Incident Repository",
            "submission_status": "EVIDENCE_PREPARED_FOR_INVESTIGATOR_REVIEW",
            "submission_notice": (
                "IMPORTANT: This dossier contains algorithmic forensic evidence and digital hashes compiled for "
                "compliance audit, law enforcement referral, and official submission by authorized personnel. "
                "No automated submission to police databases has occurred without human approval."
            )
        },
        "evidence_file": {
            "filename": document_filename,
            "size_bytes": len(evidence_bytes),
            "sha256_digest": sha256_hash,
            "mime_type": "image/jpeg" if document_filename.lower().endswith(('.jpg', '.jpeg')) else "image/png"
        },
        "screening_verdict": {
            "final_decision": final_decision,
            "risk_level": risk_level,
            "composite_risk_score": composite_risk_score,
            "tampering_score": tampering_score,
            "recommended_action": "REJECT / ESCALATE TO CYBER CELL" if risk_level == "HIGH" else "MANUAL REVIEW REQUIRED"
        },
        "quality_gate": quality_gate,
        "forensic_tampering_findings": {
            "analysis_engine": analysis_data.get("analysis_method", "OpenCV / ELA Spectral Engine"),
            "anomaly_zones_detected": len(suspicious_regions),
            "suspicious_regions": suspicious_regions,
            "forensic_flags": reasons
        },
        "extracted_ocr_data": {
            "is_readable": ocr_data.get("is_readable", False) if isinstance(ocr_data, dict) else False,
            "confidence_score": ocr_data.get("overall_confidence", 0.0) if isinstance(ocr_data, dict) else 0.0,
            "document_type": ocr_data.get("fields", {}).get("document_type", "UNKNOWN") if isinstance(ocr_data, dict) else "UNKNOWN",
            "name": ocr_data.get("fields", {}).get("name") if isinstance(ocr_data, dict) else None,
            "dob": ocr_data.get("fields", {}).get("dob") if isinstance(ocr_data, dict) else None,
            "doc_number_masked": masked_num,
            "expiry_date": ocr_data.get("fields", {}).get("expiry_date") if isinstance(ocr_data, dict) else None,
            "address": ocr_data.get("fields", {}).get("address") if isinstance(ocr_data, dict) else None,
            "gender": ocr_data.get("fields", {}).get("gender") if isinstance(ocr_data, dict) else None,
        },
        "aadhaar_validation": aadhaar_val,
        "mrz_validation_findings": {
            "mrz_detected": mrz_data.get("mrz_detected", False) if isinstance(mrz_data, dict) else False,
            "is_applicable": mrz_data.get("is_applicable", False) if isinstance(mrz_data, dict) else False,
            "status": mrz_data.get("status", "NOT_APPLICABLE") if isinstance(mrz_data, dict) else "NOT_APPLICABLE",
            "format": mrz_data.get("format", "NONE") if isinstance(mrz_data, dict) else "NONE",
            "checksums_passed": mrz_data.get("all_checksums_valid", True) if isinstance(mrz_data, dict) else True,
            "checksum_details": mrz_data.get("checksums", []) if isinstance(mrz_data, dict) else [],
        },
        "barcode_qr_findings": {
            "detected": barcode_data.get("detected", False) if isinstance(barcode_data, dict) else False,
            "status": barcode_data.get("status", "NOT_FOUND") if isinstance(barcode_data, dict) else "NOT_FOUND",
            "format": barcode_data.get("primary_format", "NONE") if isinstance(barcode_data, dict) else "NONE",
            "cross_match_verdict": barcode_data.get("status_detail") if isinstance(barcode_data, dict) else "",
            "comparisons": barcode_data.get("comparison_results", []) if isinstance(barcode_data, dict) else [],
            "is_genuine_proof_warning": barcode_data.get("is_genuine_proof_warning") if isinstance(barcode_data, dict) else ""
        },
        "analyst_notes": analyst_notes or "Case escalated for synthetic identity / document alteration review."
    }


def generate_pdf_case_report(case_payload: Dict[str, Any], output_path: Optional[str] = None) -> bytes:
    """
    Builds a professional vector PDF document case report using ReportLab.
    Includes forensic summaries, checksum tables, hash verification, and Indian Cybercrime Portal instructions.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        output_path if output_path else buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0f172a'),
        alignment=1
    )

    sub_title_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0284c7'),
        alignment=1
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=7,
        spaceAfter=3
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#334155')
    )

    elements = []

    # 1. Header Box
    cid = case_payload.get("case_id", "CYBER-CASE-001")
    gen_time = case_payload.get("generated_timestamp", "")[:19].replace("T", " ") + " UTC"
    final_verdict = case_payload.get("screening_verdict", {}).get("final_decision", "SUSPICIOUS")
    comp_score = case_payload.get("screening_verdict", {}).get("composite_risk_score", 0.0)

    header_table_data = [
        [
            Paragraph("<b>AI FORENSIC IDENTITY SCREENING & CYBERCRIME INCIDENT DOSSIER</b>", title_style),
        ],
        [
            Paragraph("OFFICIAL INCIDENT EVIDENCE & INVESTIGATION SUMMARY DOSSIER", sub_title_style),
        ]
    ]
    header_table = Table(header_table_data, colWidths=[540])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 6))

    # 2. Metadata Grid
    verdict_text_color = "#b91c1c" if "HIGH" in final_verdict else ("#b45309" if "SUSPICIOUS" in final_verdict else "#15803d")

    meta_table_data = [
        [
            Paragraph("<b>Case Reference ID:</b>", body_style),
            Paragraph(f"<b>{cid}</b>", body_style),
            Paragraph("<b>Generated Timestamp:</b>", body_style),
            Paragraph(gen_time, body_style),
        ],
        [
            Paragraph("<b>Evidence Filename:</b>", body_style),
            Paragraph(case_payload.get("evidence_file", {}).get("filename", "unknown.jpg"), body_style),
            Paragraph("<b>Screening Verdict:</b>", body_style),
            Paragraph(f"<font color='{verdict_text_color}'><b>{final_verdict} (Risk: {comp_score:.1f}/100)</b></font>", body_style),
        ],
        [
            Paragraph("<b>Evidence SHA-256:</b>", body_style),
            Paragraph(f"<font size='6' face='Courier'>{case_payload.get('evidence_file', {}).get('sha256_digest', 'N/A')}</font>", body_style),
            Paragraph("<b>Target Portal:</b>", body_style),
            Paragraph("cybercrime.gov.in (Helpline: 1930)", body_style),
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[100, 180, 100, 160])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ffffff')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#f1f5f9')),
        ('PADDING', (0, 0), (-1, -1), 3.5),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 6))

    # 3. Official Portal Reference Box
    portal_info = case_payload.get("submission_portal", {})
    portal_text = (
        f"<b>Official Reporting Authority:</b> {portal_info.get('name')}<br/>"
        f"<b>Portal Web Address:</b> <u><font color='#0369a1'>{portal_info.get('official_url')}</font></u> &nbsp;|&nbsp; "
        f"<b>National Cyber Crime Helpline:</b> <font color='#b91c1c'><b>{portal_info.get('national_helpline')}</b></font><br/>"
        f"<font color='#64748b' size='7'>{portal_info.get('submission_notice')}</font>"
    )
    portal_table = Table([[Paragraph(portal_text, body_style)]], colWidths=[540])
    portal_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f9ff')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#bae6fd')),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(portal_table)
    elements.append(Spacer(1, 6))

    # 4. Multi-Modal Verification Summary (OCR, Aadhaar, MRZ, Barcode, Forensics)
    elements.append(Paragraph("1. MULTI-MODAL SCREENING SUMMARY & VERIFICATION MATRIX", section_heading))

    ocr = case_payload.get("extracted_ocr_data", {})
    mrz = case_payload.get("mrz_validation_findings", {})
    barcode = case_payload.get("barcode_qr_findings", {})
    tampering = case_payload.get("forensic_tampering_findings", {})
    aadhaar = case_payload.get("aadhaar_validation")

    aadhaar_status_text = "N/A"
    if aadhaar:
        aadhaar_status_text = "VERHOEFF PASS" if aadhaar.get("is_verhoeff_valid") else "CHECKSUM FAILED"

    findings_table_data = [
        [
            Paragraph("<b>Forensic Dimension</b>", body_style),
            Paragraph("<b>Inspection Module</b>", body_style),
            Paragraph("<b>Result Status</b>", body_style),
            Paragraph("<b>Key Observed Evidence / Metrics</b>", body_style),
        ],
        [
            Paragraph("Error Level Analysis (ELA)", body_style),
            Paragraph("Spectral Tampering Engine", body_style),
            Paragraph(f"<font color='{'#dc2626' if tampering.get('anomaly_zones_detected', 0) > 0 else '#16a34a'}'><b>{tampering.get('anomaly_zones_detected', 0)} Anomalies</b></font>", body_style),
            Paragraph(f"Tamper Score: {case_payload.get('screening_verdict', {}).get('tampering_score', 0):.1f}% | JPEG Resampling Variance", body_style),
        ],
        [
            Paragraph("Optical Character Rec. (OCR)", body_style),
            Paragraph("RapidOCR Identity Parser", body_style),
            Paragraph(f"<b>{'READABLE' if ocr.get('is_readable') else 'UNREADABLE'}</b>", body_style),
            Paragraph(f"Conf: {ocr.get('confidence_score', 0):.1f}% | Name: {ocr.get('name') or 'N/A'} | Doc: {ocr.get('document_type')}", body_style),
        ],
        [
            Paragraph("Aadhaar Verhoeff / Pattern", body_style),
            Paragraph("UIDAI Mathematical Verifier", body_style),
            Paragraph(f"<font color='{'#16a34a' if aadhaar_status_text == 'VERHOEFF PASS' else ('#64748b' if aadhaar_status_text == 'N/A' else '#dc2626')}'><b>{aadhaar_status_text}</b></font>", body_style),
            Paragraph("12-Digit Verhoeff Math & Layout Checked (Offline Disclaimer Applies)", body_style),
        ],
        [
            Paragraph("ICAO MRZ Validation", body_style),
            Paragraph("ICAO 9303 Checksum Engine", body_style),
            Paragraph(f"<font color='{'#16a34a' if mrz.get('status') == 'VERIFIED' else ('#64748b' if mrz.get('status') == 'NOT_APPLICABLE' else '#dc2626')}'><b>{mrz.get('status')}</b></font>", body_style),
            Paragraph(f"Format: {mrz.get('format')} | Checksums Passed: {'YES' if mrz.get('checksums_passed') else 'NO'}", body_style),
        ],
        [
            Paragraph("QR / Barcode Verification", body_style),
            Paragraph("zxing-cpp 2D Scanner", body_style),
            Paragraph(f"<font color='{'#16a34a' if barcode.get('status') == 'MATCH' else ('#64748b' if barcode.get('status') == 'NOT_FOUND' else '#dc2626')}'><b>{barcode.get('status')}</b></font>", body_style),
            Paragraph(f"Format: {barcode.get('format')} | {barcode.get('cross_match_verdict') or 'N/A'}", body_style),
        ]
    ]

    findings_table = Table(findings_table_data, colWidths=[120, 110, 85, 225])
    findings_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0, 0), (-1, -1), 3.5),
    ]))
    elements.append(findings_table)
    elements.append(Spacer(1, 6))

    # 5. Extracted Identity & Document Details
    elements.append(Paragraph("2. EXTRACTED DOCUMENT IDENTIFICATION METRICS", section_heading))
    ident_data = [
        [
            Paragraph("<b>Document Type:</b>", body_style),
            Paragraph(str(ocr.get("document_type", "UNKNOWN")), body_style),
            Paragraph("<b>Applicant Full Name:</b>", body_style),
            Paragraph(str(ocr.get("name") or "NOT DETECTED"), body_style),
        ],
        [
            Paragraph("<b>Document / ID No:</b>", body_style),
            Paragraph(str(ocr.get("doc_number_masked") or "NOT DETECTED"), body_style),
            Paragraph("<b>Date of Birth:</b>", body_style),
            Paragraph(str(ocr.get("dob") or "NOT DETECTED"), body_style),
        ],
        [
            Paragraph("<b>Gender:</b>", body_style),
            Paragraph(str(ocr.get("gender") or "N/A"), body_style),
            Paragraph("<b>Address / Location:</b>", body_style),
            Paragraph(str(ocr.get("address") or "N/A"), body_style),
        ],
    ]
    ident_table = Table(ident_data, colWidths=[90, 180, 90, 180])
    ident_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ffffff')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#f1f5f9')),
        ('PADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(ident_table)
    elements.append(Spacer(1, 6))

    # 6. Specific Detection Reasons & Evidence Audit Trail
    reasons = tampering.get("forensic_flags", [])
    if reasons:
        elements.append(Paragraph("3. SPECIFIC DETECTION REASONS & EVIDENCE AUDIT TRAIL", section_heading))
        reason_rows = []
        for i, r in enumerate(reasons[:5]):
            reason_rows.append([
                Paragraph(f"<b>#{i+1}</b>", body_style),
                Paragraph(str(r), body_style),
            ])
        reason_table = Table(reason_rows, colWidths=[25, 515])
        reason_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef2f2')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#fecaca')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#fee2e2')),
            ('PADDING', (0, 0), (-1, -1), 2.5),
        ]))
        elements.append(reason_table)
        elements.append(Spacer(1, 6))

    # 7. Investigator Authorization & Chain of Custody Sign-off
    elements.append(Paragraph("4. INVESTIGATOR CHAIN-OF-CUSTODY & VERIFICATION SIGN-OFF", section_heading))
    sign_table_data = [
        [
            Paragraph("<b>Reporting Analyst:</b> Senior Forensic Examiner (ID: SEC-409)", body_style),
            Paragraph("<b>Action Status:</b> Prepared for Cyber Crime Cell Referral", body_style),
        ],
        [
            Paragraph(f"<b>Investigator Notes:</b> {case_payload.get('analyst_notes')}", body_style),
            Paragraph("<b>Digital Signature:</b> SHA-256 Cryptographic Digest Attached", body_style),
        ],
        [
            Paragraph("<b>Analyst Signature:</b> ___________________________", body_style),
            Paragraph("<b>Date of Handover:</b> ___________________________", body_style),
        ]
    ]
    sign_table = Table(sign_table_data, colWidths=[270, 270])
    sign_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0, 0), (-1, -1), 3.5),
    ]))
    elements.append(sign_table)

    # Build PDF
    doc.build(elements)

    if output_path:
        with open(output_path, "rb") as f:
            return f.read()
    else:
        buffer.seek(0)
        return buffer.read()
