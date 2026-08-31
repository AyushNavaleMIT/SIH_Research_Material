import os
import cv2
import numpy as np
from typing import Dict, Any, Tuple, Optional, List

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(os.path.dirname(BASE_DIR), "models")
YUNET_MODEL_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
HAAR_MODEL_PATH = os.path.join(MODELS_DIR, "haarcascade_frontalface_default.xml")

_detector = None
_haar = None


def get_yunet_detector(w: int = 320, h: int = 240):
    global _detector
    if os.path.exists(YUNET_MODEL_PATH):
        try:
            _detector = cv2.FaceDetectorYN.create(
                model=YUNET_MODEL_PATH,
                config="",
                input_size=(w, h),
                score_threshold=0.40,
                nms_threshold=0.3,
                top_k=5
            )
            return _detector
        except Exception as e:
            print(f"YuNet liveness init warning: {e}")
    return None


def calculate_eye_aperture(gray_img: np.ndarray, eye_x: int, eye_y: int, box_w: int, box_h: int) -> float:
    """
    Robust Dual-Cue Eye Aspect Ratio (EAR) Proxy:
    Combines vertical eyelid aperture profiling + pupil/iris contrast differentiation.
    Tolerant of glasses, lighting variance, and head tilt.
    Returns value in range [0.06 (fully closed) to 0.38 (wide open)].
    """
    try:
        ew = max(10, int(box_w * 0.18))
        eh = max(8, int(box_h * 0.13))

        x1 = max(0, eye_x - ew // 2)
        y1 = max(0, eye_y - eh // 2)
        x2 = min(gray_img.shape[1], eye_x + ew // 2)
        y2 = min(gray_img.shape[0], eye_y + eh // 2)

        roi = gray_img[y1:y2, x1:x2]
        if roi.size < 20 or roi.shape[0] < 4 or roi.shape[1] < 4:
            return 0.26

        h, w = roi.shape[:2]
        blurred = cv2.GaussianBlur(roi, (3, 3), 0)

        # 1. Vertical Gradient Variance (High when eye open due to eyelid margins & pupil boundary)
        grad_y = cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=3)
        grad_std = float(np.std(grad_y))

        # 2. Central Iris / Pupil Aperture Span
        center_x1 = int(w * 0.20)
        center_x2 = int(w * 0.80)
        center_slice = blurred[:, center_x1:center_x2]

        _, dark_mask = cv2.threshold(center_slice, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        dark_rows = np.where(dark_mask > 0)[0]

        if len(dark_rows) > 4:
            y_span = float(np.percentile(dark_rows, 90) - np.percentile(dark_rows, 10))
            norm_span = min(1.0, max(0.0, y_span / float(h)))
        else:
            norm_span = 0.0

        # 3. Upper/Lower Skin vs Center Pupil Contrast
        top_skin = float(np.mean(blurred[:max(1, int(h * 0.2)), :]))
        bot_skin = float(np.mean(blurred[min(h - 1, int(h * 0.8)):, :]))
        center_pupil = float(np.mean(blurred[int(h * 0.3):int(h * 0.7), center_x1:center_x2]))
        skin_contrast = max(0.0, ((top_skin + bot_skin) / 2.0 - center_pupil) / 255.0)

        # Composite EAR Score: ~0.08 when fully closed, ~0.26 - 0.36 when open
        ear = 0.06 + (norm_span * 0.22) + (skin_contrast * 0.12) + min(0.08, (grad_std / 50.0) * 0.08)
        return float(round(max(0.05, min(0.45, ear)), 3))
    except Exception:
        return 0.26


def calculate_head_pose_yaw(re_x: float, le_x: float, nose_x: float) -> float:
    """
    Calculates 3D Head Pose Yaw Angle relative to the PERSON'S PERSPECTIVE:
    - Positive Yaw (> +12°) = Person turned towards THEIR LEFT
    - Negative Yaw (< -12°) = Person turned towards THEIR RIGHT
    """
    try:
        eye_mid_x = (re_x + le_x) / 2.0
        eye_dist = max(10.0, abs(le_x - re_x))
        displacement = (nose_x - eye_mid_x) / (eye_dist * 0.5)
        yaw_deg = float(displacement * 30.0)
        return float(round(max(-60.0, min(60.0, yaw_deg)), 1))
    except Exception:
        return 0.0


# In-memory tracking for active liveness session state
_LIVENESS_SESSIONS: Dict[str, Dict[str, Any]] = {}


def get_or_create_liveness_session(session_id: str) -> Dict[str, Any]:
    if session_id not in _LIVENESS_SESSIONS:
        _LIVENESS_SESSIONS[session_id] = {
            "current_challenge": "BLINK_TWICE",
            "state": "FACE_NOT_DETECTED",
            "baseline_ear": None,
            "calibration_samples": [],
            "blink_count": 0,
            "open_frames": 0,
            "closed_frames": 0,
            "turn_hold_frames": 0,
            "ear_history": [],
            "completed_challenges": [],
            "passed": False,
            "failed": False,
            "message": "Position your face inside the frame"
        }
    return _LIVENESS_SESSIONS[session_id]


def reset_liveness_session(session_id: str) -> Dict[str, Any]:
    _LIVENESS_SESSIONS[session_id] = {
        "current_challenge": "BLINK_TWICE",
        "state": "FACE_NOT_DETECTED",
        "baseline_ear": None,
        "calibration_samples": [],
        "blink_count": 0,
        "open_frames": 0,
        "closed_frames": 0,
        "turn_hold_frames": 0,
        "ear_history": [],
        "completed_challenges": [],
        "passed": False,
        "failed": False,
        "message": "Position your face inside the frame"
    }
    return _LIVENESS_SESSIONS[session_id]


def process_liveness_frame(
    frame_bytes: bytes,
    session_id: str = "default",
    challenge_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Industrial-Grade Multi-Frame Temporal Active Liveness Engine:
    - Challenge 1: BLINK_TWICE with Adaptive Baseline & Temporal State Machine:
      FACE_NOT_DETECTED -> FACE_DETECTED -> EYES_OPEN -> EYE_CLOSING -> EYES_CLOSED -> EYE_OPENING -> BLINK_CONFIRMED
    - Challenge 2: TURN_LEFT (Head rotated towards person's own left shoulder >= +12°)
    - Challenge 3: TURN_RIGHT (Head rotated towards person's own right shoulder <= -12°)
    """
    np_arr = np.frombuffer(frame_bytes, np.uint8)
    frame_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if frame_bgr is None or frame_bgr.size == 0:
        return {
            "success": False,
            "face_detected": False,
            "error": "INVALID_FRAME",
            "message": "Camera frame could not be decoded."
        }

    h, w = frame_bgr.shape[:2]
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)

    detector = get_yunet_detector(w, h)
    faces = None
    if detector is not None:
        try:
            detector.setInputSize((w, h))
            _, faces = detector.detect(frame_bgr)
        except Exception:
            pass

    session = get_or_create_liveness_session(session_id)
    if challenge_type and challenge_type != session.get("current_challenge"):
        session["current_challenge"] = challenge_type
        session["turn_hold_frames"] = 0

    current_ch = session["current_challenge"]

    # 1. Multiple Faces Gate
    if faces is not None and len(faces) > 1:
        return {
            "success": True,
            "face_detected": True,
            "current_challenge": current_ch,
            "progress_pct": 0.0,
            "challenge_passed": False,
            "all_passed": False,
            "message": "Multiple faces detected. Ensure only one person is in view.",
            "metrics": {
                "ear": 0.26,
                "yaw_deg": 0.0,
                "pitch_deg": 0.0,
                "blink_count": session.get("blink_count", 0)
            }
        }

    # 2. No Face Detected Gate: Reset state
    if faces is None or len(faces) == 0:
        session["state"] = "FACE_NOT_DETECTED"
        session["open_frames"] = 0
        session["closed_frames"] = 0
        session["calibration_samples"] = []
        return {
            "success": True,
            "face_detected": False,
            "current_challenge": current_ch,
            "progress_pct": 0.0,
            "challenge_passed": False,
            "all_passed": False,
            "message": "Position your face inside the frame.",
            "metrics": {
                "ear": 0.26,
                "yaw_deg": 0.0,
                "pitch_deg": 0.0,
                "blink_count": session.get("blink_count", 0)
            }
        }

    # Extract Face Landmark Coordinates
    f = faces[0]
    bx, by, bw, bh = int(f[0]), int(f[1]), int(f[2]), int(f[3])
    re_x, re_y = float(f[4]), float(f[5])     # Right Eye
    le_x, le_y = float(f[6]), float(f[7])     # Left Eye
    nose_x, nose_y = float(f[8]), float(f[9]) # Nose Tip

    # Calculate Eye Openness for Both Eyes
    ear_r = calculate_eye_aperture(gray, int(re_x), int(re_y), bw, bh)
    ear_l = calculate_eye_aperture(gray, int(le_x), int(le_y), bw, bh)
    instant_ear = float((ear_r + ear_l) / 2.0)

    # 2-frame smoothing to eliminate single-frame camera sensor noise
    history = session.setdefault("ear_history", [])
    history.append(instant_ear)
    if len(history) > 2:
        history.pop(0)
    smoothed_ear = float(np.mean(history))

    # Calculate Head Pose Yaw
    yaw_deg = calculate_head_pose_yaw(re_x, le_x, nose_x)

    ch_passed = False
    progress_pct = 0.0
    msg = ""

    # Establish Adaptive Baseline EAR for this user
    if session.get("baseline_ear") is None:
        calib = session.setdefault("calibration_samples", [])
        calib.append(smoothed_ear)
        if len(calib) >= 3:
            session["baseline_ear"] = float(np.percentile(calib, 75))
            session["baseline_ear"] = max(0.20, min(0.38, session["baseline_ear"]))
            session["state"] = "EYES_OPEN"
        else:
            session["state"] = "CALIBRATING"
            return {
                "success": True,
                "face_detected": True,
                "current_challenge": current_ch,
                "progress_pct": 0.0,
                "challenge_passed": False,
                "all_passed": False,
                "message": "Face detected. Establishing eye baseline...",
                "metrics": {
                    "ear": round(smoothed_ear, 2),
                    "yaw_deg": round(yaw_deg, 1),
                    "pitch_deg": 0.0,
                    "blink_count": session.get("blink_count", 0)
                }
            }

    b = session["baseline_ear"]
    th_open = b * 0.85
    th_closing = b * 0.70
    th_closed = max(0.12, b * 0.55)
    th_reopen = b * 0.80

    state = session.get("state", "EYES_OPEN")
    blink_count = session.get("blink_count", 0)

    # =========================================================================
    # Challenge 1: Temporal Natural Blink Detection State Machine
    # =========================================================================
    if current_ch == "BLINK_TWICE":
        if state in ["EYES_OPEN", "CALIBRATING", "FACE_DETECTED"]:
            if smoothed_ear <= th_closing:
                session["state"] = "EYE_CLOSING"
                session["closed_frames"] = 1
                session["open_frames"] = 0
            else:
                session["open_frames"] = session.get("open_frames", 0) + 1
                msg = f"Eyes detected. Please blink naturally ({blink_count}/2 completed)."

        elif state == "EYE_CLOSING":
            if smoothed_ear <= th_closed or (ear_r <= th_closed and ear_l <= th_closed):
                session["state"] = "EYES_CLOSED"
                session["closed_frames"] = session.get("closed_frames", 1) + 1
            elif smoothed_ear >= th_open:
                session["state"] = "EYES_OPEN"
                session["closed_frames"] = 0
            else:
                session["closed_frames"] = session.get("closed_frames", 1) + 1

        elif state == "EYES_CLOSED":
            if smoothed_ear <= th_closed:
                closed_count = session.get("closed_frames", 1) + 1
                session["closed_frames"] = closed_count
                if closed_count > 12:
                    session["state"] = "STALLED_CLOSED"
                    msg = "Please open your eyes to complete the blink."
            elif smoothed_ear >= th_closing or instant_ear >= th_closing:
                session["state"] = "EYE_OPENING"

        elif state == "EYE_OPENING":
            if smoothed_ear >= th_reopen or instant_ear >= th_reopen:
                # Full OPEN -> CLOSED -> OPEN cycle verified!
                blink_count += 1
                session["blink_count"] = blink_count
                session["state"] = "BLINK_CONFIRMED"
                session["closed_frames"] = 0
                session["open_frames"] = 1
                msg = f"Blink {blink_count} of 2 verified!"
                if blink_count >= 2:
                    ch_passed = True
            elif smoothed_ear <= th_closed:
                session["state"] = "EYES_CLOSED"
                session["closed_frames"] = session.get("closed_frames", 1) + 1

        elif state == "BLINK_CONFIRMED":
            session["state"] = "EYES_OPEN"
            msg = f"Blink confirmed ({blink_count}/2)"
            if blink_count >= 2:
                ch_passed = True

        elif state == "STALLED_CLOSED":
            if smoothed_ear >= th_reopen:
                session["state"] = "EYES_OPEN"
                session["closed_frames"] = 0
                msg = "Eyes open. Please blink naturally."
            else:
                msg = "Please open your eyes."

        progress_pct = min(100.0, (blink_count / 2.0) * 100.0)
        if blink_count >= 2:
            ch_passed = True
            msg = "Natural blinks verified! (2/2 completed)"

    # =========================================================================
    # Challenge 2: Head Turn to Person's Own Left
    # =========================================================================
    elif current_ch == "TURN_LEFT":
        if yaw_deg >= 12.0:
            session["turn_hold_frames"] = session.get("turn_hold_frames", 0) + 1
            progress_pct = min(100.0, (session["turn_hold_frames"] / 2.0) * 100.0)
            if session["turn_hold_frames"] >= 2:
                ch_passed = True
                msg = "Turn left verified! (Yaw: +{:.1f}°)".format(yaw_deg)
            else:
                msg = "Hold position to YOUR left..."
        else:
            session["turn_hold_frames"] = max(0, session.get("turn_hold_frames", 0) - 1)
            progress_pct = max(0.0, (yaw_deg / 12.0) * 50.0)
            msg = "Turn your head to YOUR LEFT ← (Current: {:.1f}°)".format(yaw_deg)

    # =========================================================================
    # Challenge 3: Head Turn to Person's Own Right
    # =========================================================================
    elif current_ch == "TURN_RIGHT":
        if yaw_deg <= -12.0:
            session["turn_hold_frames"] = session.get("turn_hold_frames", 0) + 1
            progress_pct = min(100.0, (session["turn_hold_frames"] / 2.0) * 100.0)
            if session["turn_hold_frames"] >= 2:
                ch_passed = True
                msg = "Turn right verified! (Yaw: {:.1f}°)".format(yaw_deg)
            else:
                msg = "Hold position to YOUR right..."
        else:
            session["turn_hold_frames"] = max(0, session.get("turn_hold_frames", 0) - 1)
            progress_pct = max(0.0, (abs(yaw_deg) / 12.0) * 50.0)
            msg = "Turn your head to YOUR RIGHT → (Current: {:.1f}°)".format(yaw_deg)

    if ch_passed and current_ch not in session.setdefault("completed_challenges", []):
        session["completed_challenges"].append(current_ch)

    all_passed = len(session.get("completed_challenges", [])) >= 3

    return {
        "success": True,
        "face_detected": True,
        "current_challenge": current_ch,
        "progress_pct": round(progress_pct, 1),
        "challenge_passed": ch_passed,
        "all_passed": all_passed,
        "message": msg or session.get("message", "Looking at camera..."),
        "metrics": {
            "ear": round(smoothed_ear, 2),
            "yaw_deg": round(yaw_deg, 1),
            "pitch_deg": 0.0,
            "blink_count": session.get("blink_count", 0),
            "state": session.get("state", "EYES_OPEN")
        }
    }
