import os
import json
import uuid
import hashlib
import secrets
import time
from typing import Dict, Any, List, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)
USERS_FILE = os.path.join(DATA_DIR, "users.json")
VERIFICATIONS_FILE = os.path.join(DATA_DIR, "verifications.json")

# In-memory storage with file-backing
_USERS_DB: Dict[str, Dict[str, Any]] = {}
_SESSIONS_DB: Dict[str, Dict[str, Any]] = {}
_VERIFICATIONS_DB: List[Dict[str, Any]] = []


def _hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return key.hex(), salt


def _load_data():
    global _USERS_DB, _VERIFICATIONS_DB
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, "r", encoding="utf-8") as f:
                _USERS_DB = json.load(f)
        except Exception:
            _USERS_DB = {}
    
    if os.path.exists(VERIFICATIONS_FILE):
        try:
            with open(VERIFICATIONS_FILE, "r", encoding="utf-8") as f:
                _VERIFICATIONS_DB = json.load(f)
        except Exception:
            _VERIFICATIONS_DB = []

    # Seed demo accounts if empty
    if "user@sentinel.ai" not in _USERS_DB:
        pwd_hash, salt = _hash_password("DemoUser@123")
        _USERS_DB["user@sentinel.ai"] = {
            "id": "USR-IND-001",
            "email": "user@sentinel.ai",
            "username": "demouser",
            "full_name": "Demo Applicant",
            "role": "INDIVIDUAL",
            "password_hash": pwd_hash,
            "salt": salt,
            "created_at": "2026-08-31T00:00:00Z"
        }
    
    if "bank@sentinel.ai" not in _USERS_DB:
        pwd_hash, salt = _hash_password("DemoBank@123")
        _USERS_DB["bank@sentinel.ai"] = {
            "id": "ORG-BNK-001",
            "email": "bank@sentinel.ai",
            "username": "demobank",
            "org_name": "HDFC Security & KYC Desk",
            "org_id": "ORG-HDFC-9921",
            "org_type": "BANK",
            "authorized_person": "Compliance Officer",
            "role": "ORGANISATION",
            "password_hash": pwd_hash,
            "salt": salt,
            "created_at": "2026-08-31T00:00:00Z"
        }
    _save_data()


def _save_data():
    try:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(_USERS_DB, f, indent=2)
    except Exception as e:
        print(f"Failed to save users: {e}")

    try:
        with open(VERIFICATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(_VERIFICATIONS_DB, f, indent=2)
    except Exception as e:
        print(f"Failed to save verifications: {e}")


_load_data()


def register_user(payload: Dict[str, Any]) -> Dict[str, Any]:
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")
    role = payload.get("role", "INDIVIDUAL").upper()

    if not email or "@" not in email:
        raise ValueError("Valid email address is required.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")
    if email in _USERS_DB:
        raise ValueError("An account with this email already exists.")

    pwd_hash, salt = _hash_password(password)
    user_id = f"USR-{uuid.uuid4().hex[:8].upper()}" if role == "INDIVIDUAL" else f"ORG-{uuid.uuid4().hex[:8].upper()}"

    user_record: Dict[str, Any] = {
        "id": user_id,
        "email": email,
        "username": payload.get("username", email.split("@")[0]),
        "role": role,
        "password_hash": pwd_hash,
        "salt": salt,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    if role == "INDIVIDUAL":
        user_record["full_name"] = payload.get("full_name", "Applicant Subject")
    else:
        user_record["org_name"] = payload.get("org_name", "Authorized Institution")
        user_record["org_id"] = payload.get("org_id", f"ORG-{uuid.uuid4().hex[:6].upper()}")
        user_record["org_type"] = payload.get("org_type", "COMPANY")
        user_record["authorized_person"] = payload.get("authorized_person", "Authorized Officer")

    _USERS_DB[email] = user_record
    _save_data()

    # Generate login token
    token = secrets.token_urlsafe(32)
    _SESSIONS_DB[token] = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "created_at": time.time()
    }

    sanitized = {k: v for k, v in user_record.items() if k not in ["password_hash", "salt"]}
    return {"token": token, "user": sanitized}


def login_user(email: str, password: str) -> Dict[str, Any]:
    email = email.strip().lower()
    user_record = _USERS_DB.get(email)

    if not user_record:
        raise ValueError("Invalid email or password.")

    pwd_hash, _ = _hash_password(password, user_record["salt"])
    if pwd_hash != user_record["password_hash"]:
        raise ValueError("Invalid email or password.")

    token = secrets.token_urlsafe(32)
    _SESSIONS_DB[token] = {
        "user_id": user_record["id"],
        "email": email,
        "role": user_record["role"],
        "created_at": time.time()
    }

    sanitized = {k: v for k, v in user_record.items() if k not in ["password_hash", "salt"]}
    return {"token": token, "user": sanitized}


def get_current_user_from_token(token: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token or token not in _SESSIONS_DB:
        return None
    sess = _SESSIONS_DB[token]
    user_record = _USERS_DB.get(sess["email"])
    if not user_record:
        return None
    return {k: v for k, v in user_record.items() if k not in ["password_hash", "salt"]}


def logout_user(token: str) -> bool:
    if token in _SESSIONS_DB:
        del _SESSIONS_DB[token]
        return True
    return False


def save_verification_record(user: Optional[Dict[str, Any]], record_data: Dict[str, Any]) -> Dict[str, Any]:
    owner_id = user.get("id") if user else "ANONYMOUS"
    owner_email = user.get("email") if user else "anonymous@sentinel.ai"
    owner_role = user.get("role") if user else "INDIVIDUAL"
    org_name = user.get("org_name", "") if user else ""

    case_id = record_data.get("case_id") or record_data.get("caseId") or f"VERIF-{uuid.uuid4().hex[:8].upper()}"

    doc_data = record_data.get("doc_data") or record_data.get("docAnalysis") or {}
    ocr_fields = doc_data.get("ocr", {}).get("fields", {})

    record: Dict[str, Any] = {
        "case_id": case_id,
        "owner_id": owner_id,
        "owner_email": owner_email,
        "owner_role": owner_role,
        "org_name": org_name,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "applicant_name": ocr_fields.get("name") or record_data.get("applicant_name") or "Applicant Subject",
        "document_type": doc_data.get("documentType") or doc_data.get("document_type") or "NATIONAL_ID",
        "source_display": doc_data.get("source_display") or doc_data.get("source_type") or "Document",
        "final_decision": record_data.get("final_decision") or record_data.get("finalDecision") or "VERIFIED",
        "overall_risk_score": float(record_data.get("overall_risk_score") or record_data.get("overallRiskScore") or 5.0),
        "overall_status": record_data.get("overall_status") or record_data.get("overallStatus") or "LOW",
        "evidence_sha256": doc_data.get("evidenceSha256") or doc_data.get("evidence_sha256") or "",
        "reasons": doc_data.get("suspiciousReasons") or doc_data.get("reasons") or [],
        "liveness_passed": bool(record_data.get("liveness_passed", True)),
        "face_similarity": float(record_data.get("face_similarity", 95.0)),
        "ocr_fields": {
            "name": ocr_fields.get("name") or "Not confidently detected",
            "docNumber": ocr_fields.get("docNumber") or "Not confidently detected",
            "dob": ocr_fields.get("dob") or "Not confidently detected",
            "gender": ocr_fields.get("gender") or "Not confidently detected",
            "address": ocr_fields.get("address") or "Not confidently detected",
        }
    }

    # Upsert or prepend to history
    existing_idx = next((i for i, r in enumerate(_VERIFICATIONS_DB) if r["case_id"] == case_id), -1)
    if existing_idx >= 0:
        _VERIFICATIONS_DB[existing_idx] = record
    else:
        _VERIFICATIONS_DB.insert(0, record)

    _save_data()
    return record


def get_user_verification_history(user: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not user:
        return []
    owner_id = user.get("id")
    # Strict tenant isolation: User/Org can only see records they created!
    return [r for r in _VERIFICATIONS_DB if r.get("owner_id") == owner_id]


def get_verification_record_by_id(case_id: str, user: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    for r in _VERIFICATIONS_DB:
        if r.get("case_id") == case_id:
            # Check ownership or allow if anonymous/testing
            if user and r.get("owner_id") != user.get("id") and user.get("role") != "ADMIN":
                return None
            return r
    return None
