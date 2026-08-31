# AI Multi-Modal Fake Identity & Document Screening System

A comprehensive forensic identity verification platform that combines **Spectral Error Level Analysis (ELA)**, **Real Local OCR**, **ICAO 9303 MRZ Checksum Validation**, **QR / 2D Barcode Cross-Verification**, **Biometric 3D Liveness**, and **Cybercrime Case Reporting**.

---

## 🌟 Core Working Features (100% Local & Free / Open-Source)

### 1. Real OCR Field Extraction Engine
- **Engine**: Local CPU ONNX inference via `rapidocr-onnxruntime`. Zero external API keys or paid services.
- **Fields Extracted**: Applicant Full Name, Date of Birth (DOB), Document / ID Number (Passport, Driving License, Aadhaar, PAN), Expiry Date, Issue Date, Address, and Classified Document Type.
- **Graceful Error Handling**: Resilient to blurry or low-contrast scans with automatic contrast normalization fallback and OCR confidence scoring.
- **Risk Engine Integration**: Extracted fields feed directly into data consistency cross-matching.

### 2. ICAO 9303 MRZ Checksum Validation Engine
- **ICAO Standard**: Implements official ICAO Doc 9303 check digit algorithms using weights `[7, 3, 1]` modulo 10.
- **Supported Formats**:
  - **TD3 (Passports)**: 2 lines × 44 characters (Document Number, DOB, Expiry, Composite Checksums).
  - **TD1 (National IDs)**: 3 lines × 30 characters (Multi-line integrity and check digits).
  - **TD2 (ID Cards / Visas)**: 2 lines × 36 characters.
- **Distinct Statuses**:
  - `VERIFIED`: All mathematical checksums passed.
  - `FAILED`: Check digit mismatch detected (strong indicator of digital tampering/splicing).
  - `NOT_APPLICABLE`: Document type does not use MRZ (e.g. Standard Driver License, PAN). **Document is NOT marked fake.**
  - `INVALID`: Malformed or degraded MRZ format.
- **Zero Hallucination**: Never invents or fabricates MRZ data.

### 3. QR / Barcode Verification & Cross-Matching
- **Engine**: Local multi-format 1D/2D barcode decoder using `zxing-cpp` and OpenCV.
- **Supported Formats**: QR Code, PDF417 (common on US/international driver licenses), DataMatrix, Aztec, Code 128, Code 39, EAN-13.
- **Automated Cross-Verification**: Compares decoded payload data (Name, Document ID, Date of Birth) with visual OCR extracted fields.
- **Distinct Statuses**: `MATCH`, `MISMATCH`, `INVALID`, `NOT_FOUND`.
- **Security Notice**: Decoded barcodes confirm digital readability, but absence (`NOT_FOUND`) does not penalize legitimate non-barcode IDs.

### 4. Cybercrime Case Reporting & Escalation Engine
- **Incident Dossier Generation**: Available for `SUSPICIOUS` and `HIGH RISK` results.
- **Cryptographic Chain of Custody**: Computes **SHA-256 hash** of the original uploaded document evidence image.
- **Downloadable Reports**: Generates official **PDF Case Reports** (via ReportLab vector engine) and structured **JSON Case Dossiers**.
- **Official Portal Integration**: Directly references the **Indian National Cyber Crime Reporting Portal**:
  - Official Web Portal: [https://www.cybercrime.gov.in/](https://www.cybercrime.gov.in/)
  - National Cyber Crime Helpline: **1930 (24x7 Toll-Free)**
- **Investigator-Ready**: Prepares forensic audit trails and evidence summaries for authorized human review and official law enforcement submission. No fake police APIs.

---

## 🛠️ Architecture Overview

```
identity-screening-app/
├── backend/
│   ├── forensics/
│   │   ├── analyzer.py        # Multi-modal risk scoring & ELA engine
│   │   ├── barcode_engine.py  # zxing-cpp QR & 1D/2D Barcode cross-verification
│   │   ├── mrz_engine.py      # ICAO 9303 TD1/TD2/TD3 check digit calculator
│   │   ├── ocr_engine.py      # RapidOCR ONNX local text & field parser
│   │   ├── preprocessor.py    # Blur detection, contrast normalization, resizing
│   │   ├── reporting_engine.py# SHA-256 hashing & ReportLab PDF/JSON generator
│   │   ├── validation.py     # Image integrity & MIME format validator
│   │   └── visualizer.py     # ELA thermal heatmap generator & bounding boxes
│   ├── main.py                # FastAPI endpoints & static file serving
│   ├── requirements.txt       # Backend Python dependencies
│   ├── test_pipeline.py       # Module unit tests
│   └── test_e2e.py            # End-to-end integration test suite
├── src/
│   ├── components/
│   │   ├── BarcodeVerificationCard.tsx # 2D Barcode & QR verification UI
│   │   ├── CybercrimeReportModal.tsx   # Cybercrime case creation & PDF export
│   │   ├── FileUpload.tsx              # Drag-and-drop document uploader
│   │   ├── Header.tsx                  # Top navigation & system status
│   │   ├── HeatmapViewer.tsx           # Thermal ELA overlay & anomaly viewer
│   │   ├── LivenessChallenge.tsx       # 3D interactive motion liveness
│   │   ├── MrzValidationCard.tsx       # ICAO MRZ checksum breakdown table
│   │   ├── OcrResultCard.tsx           # Extracted identity fields card
│   │   ├── ReasonCard.tsx              # Explainable AI (XAI) reason cards
│   │   ├── RiskCard.tsx                # 5-dimension risk score progress bars
│   │   ├── Sidebar.tsx                 # Core module navigation
│   │   ├── Stepper.tsx                 # 5-step wizard sequence
│   │   └── WebcamCapture.tsx           # Real-time face match camera
│   ├── pages/
│   │   ├── DocumentForensics.tsx       # Module 6: Multi-Modal Forensics Page
│   │   ├── FaceVerification.tsx        # Module 7: Biometric Face & Liveness
│   │   ├── RiskDashboard.tsx           # Module 8: Explainable Risk Dashboard
│   │   └── UnifiedWorkflow.tsx         # Guided 5-stage screening wizard
│   ├── services/
│   │   └── api.ts                      # Frontend API client
│   └── types/
│       └── index.ts                    # TypeScript data models
└── package.json
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **Python**: 3.10+ (tested on Python 3.12)

---

### Step 1: Start the Backend (FastAPI Server)

1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```

2. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the FastAPI server:
   ```bash
   python main.py
   ```
   *The backend will be running on `http://localhost:8000`.*
   *API documentation is accessible at `http://localhost:8000/docs`.*

4. *(Optional)* Run backend integration tests:
   ```bash
   python test_e2e.py
   ```

---

### Step 2: Start the Frontend (Vite + React)

1. Open a new terminal in the project root:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```
   *Open `http://localhost:5173` in your web browser.*

3. To build the production bundle:
   ```bash
   npm run build
   ```

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | System health check & active capabilities |
| `POST` | `/forensics/analyze` | Multi-modal document screening (ELA + OCR + MRZ + QR + SHA-256) |
| `POST` | `/forensics/report/generate` | Generates official Cybercrime Case Report (PDF & JSON) |
| `GET` | `/forensics/report/pdf/{case_id}` | Downloads official vector PDF report |
| `GET` | `/forensics/report/json/{case_id}` | Downloads structured JSON evidence dossier |

---

## ⚖️ Official Cybercrime Submission Guidelines

When a document exhibits **Suspicious** or **High-Risk** tampering:
1. Click **"Create Cybercrime Case"** from the Forensics or Risk Dashboard page.
2. Review the cryptographic **SHA-256 evidence digest** and extracted identity anomalies.
3. Download the **Official PDF Case Report** or **JSON Dossier**.
4. Refer the case directly to the **Indian National Cyber Crime Reporting Portal**:
   - Web: [https://www.cybercrime.gov.in/](https://www.cybercrime.gov.in/)
   - Helpline: **1930**
