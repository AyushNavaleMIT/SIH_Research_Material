# Centralized Thresholds & Configuration for Identity Screening Forensic Engine (v4.0)

QUALITY_GATE_CONFIG = {
    "min_width": 380,
    "min_height": 380,
    "recommended_width": 800,
    "recommended_height": 600,
    "min_blur_laplacian": 45.0,        # Below this is severely blurry
    "warning_blur_laplacian": 75.0,    # Below this is moderately blurry
    "min_mean_luminance": 35.0,        # Underexposed / dark threshold
    "max_mean_luminance": 248.0,       # Severely washed out threshold
    "max_glare_ratio": 0.20,           # Max allowable specular reflection ratio (20%)
    "max_skew_angle_deg": 18.0,        # Skew angle triggering alignment warning
}

FORENSIC_CONFIG = {
    "ela_jpeg_quality": 90,
    "ela_std_tamper_threshold": 42.0,
    "texture_variance_threshold": 32.0,
    "sobel_edge_anomaly_threshold": 80.0,
    "min_suspicious_region_area_pct": 0.015,
    
    # Feature weights for Composite Document Forensics
    "weight_ela": 20,
    "weight_ocr_consistency": 40,
    "weight_barcode_qr": 25,
    "weight_structure_layout": 15,
}

FACE_CONFIG = {
    "cosine_similarity_pass_threshold": 70.0,  # Req >= 70.0% for PASS
    "face_match_pass_threshold": 70.0,
    "cosine_similarity_warn_threshold": 60.0,  # 60.0 - 69.9% for MANUAL_REVIEW
    "min_face_crop_size": 64,                  # Min width/height of face in pixels
    "min_face_size_px": 40,                    # Min face detection box size
    "min_selfie_blur_laplacian": 20.0,         # Minimum face crop Laplacian variance
    "sface_feature_dim": 128,
}
FACE_VERIFY_CONFIG = FACE_CONFIG

LIVENESS_CONFIG = {
    "ear_blink_threshold": 0.20,              # Eye aspect ratio below this is a blink
    "ear_consecutive_frames": 2,               # Min frames for valid blink
    "required_blinks": 2,                      # Number of blinks required
    "yaw_turn_threshold_deg": 14.0,           # Head pose yaw angle for left/right turn
    "session_timeout_seconds": 30,
}

RISK_CONFIG = {
    # 4-Level Decision Thresholds (0 - 100 Risk Scale)
    "score_verified_max": 28.0,               # 0.0 - 28.0 = VERIFIED (LOW RISK)
    "score_suspicious_max": 58.0,             # 28.1 - 58.0 = SUSPICIOUS (MANUAL REVIEW)
    # > 58.0 = HIGH RISK / FAILED

    # Step-by-Step Multi-Modal Risk Weights
    "weight_step1_doc_forensics": 35,
    "weight_step1_checksums_data": 25,
    "weight_step2_face_match": 25,
    "weight_step3_liveness": 15,

    # Backward-compatible weight aliases
    "weight_document_authenticity": 35,
    "weight_data_consistency": 25,
    "weight_face_match": 25,
    "weight_liveness": 15,
}
