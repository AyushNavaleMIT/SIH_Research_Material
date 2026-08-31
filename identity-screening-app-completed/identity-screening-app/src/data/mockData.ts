import type { SampleCase } from '../types';

// Helper inline SVG Data URIs for offline reliable rendering
const passportSvgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="none">
  <rect width="600" height="400" rx="16" fill="#0F172A"/>
  <rect x="20" y="20" width="560" height="360" rx="12" fill="#1E293B" stroke="#334155" stroke-width="2"/>
  
  <!-- Header Bar -->
  <rect x="40" y="40" width="520" height="50" rx="6" fill="#0284C7" fill-opacity="0.2" stroke="#0EA5E9" stroke-width="1.5"/>
  <text x="60" y="70" fill="#38BDF8" font-family="monospace" font-size="18" font-weight="bold">PASSPORT / PASSEPORT - REPUBLIC OF CYBERIA</text>
  <text x="480" y="70" fill="#94A3B8" font-family="monospace" font-size="14">P&lt;CYB</text>

  <!-- Photo Box -->
  <rect x="50" y="110" width="140" height="180" rx="8" fill="#0F172A" stroke="#38BDF8" stroke-width="2"/>
  <circle cx="120" cy="170" r="40" fill="#334155"/>
  <path d="M75 270 C 75 220, 165 220, 165 270 Z" fill="#334155"/>
  <text x="75" y="280" fill="#64748B" font-family="sans-serif" font-size="10">OFFICIAL BIOMETRIC PHOTO</text>

  <!-- Details Fields -->
  <text x="210" y="130" fill="#64748B" font-family="monospace" font-size="11">SURNAME / NOM</text>
  <text x="210" y="150" fill="#F8FAFC" font-family="sans-serif" font-size="16" font-weight="bold">VALENTINE</text>

  <text x="210" y="180" fill="#64748B" font-family="monospace" font-size="11">GIVEN NAMES / PRENOMS</text>
  <text x="210" y="200" fill="#F8FAFC" font-family="sans-serif" font-size="16" font-weight="bold">ALEXANDER JAMES</text>

  <text x="210" y="230" fill="#64748B" font-family="monospace" font-size="11">NATIONALITY / NATIONALITE</text>
  <text x="210" y="250" fill="#38BDF8" font-family="sans-serif" font-size="14" font-weight="bold">CYBERIAN (CYB)</text>

  <text x="380" y="230" fill="#64748B" font-family="monospace" font-size="11">DATE OF BIRTH / DOB</text>
  <text x="380" y="250" fill="#F8FAFC" font-family="sans-serif" font-size="14">14 APR 1988</text>

  <text x="210" y="280" fill="#64748B" font-family="monospace" font-size="11">PASSPORT NO. / NO. DU PASSEPORT</text>
  <text x="210" y="300" fill="#F8FAFC" font-family="monospace" font-size="15" font-weight="bold">CY-9842011A</text>

  <text x="400" y="280" fill="#64748B" font-family="monospace" font-size="11">EXPIRY DATE</text>
  <text x="400" y="300" fill="#F8FAFC" font-family="sans-serif" font-size="14">22 OCT 2031</text>

  <!-- MRZ Zone -->
  <rect x="40" y="325" width="520" height="40" rx="4" fill="#090D16" stroke="#1E293B"/>
  <text x="50" y="343" fill="#38BDF8" font-family="monospace" font-size="13" letter-spacing="2">P&lt;CYBVALENTINE&lt;&lt;ALEXANDER&lt;JAMES&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
  <text x="50" y="358" fill="#38BDF8" font-family="monospace" font-size="13" letter-spacing="2">CY9842011A4CYB8804148M3110222&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;06</text>
</svg>
`)}`;

const tamperedPassportSvgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="none">
  <rect width="600" height="400" rx="16" fill="#0F172A"/>
  <rect x="20" y="20" width="560" height="360" rx="12" fill="#1E293B" stroke="#F43F5E" stroke-width="2"/>
  
  <!-- Header Bar -->
  <rect x="40" y="40" width="520" height="50" rx="6" fill="#F43F5E" fill-opacity="0.1" stroke="#F43F5E" stroke-width="1.5"/>
  <text x="60" y="70" fill="#FB7185" font-family="monospace" font-size="18" font-weight="bold">DRIVER LICENSE - STATE OF PACIFICA</text>

  <!-- Photo Box (Spliced Tampered) -->
  <rect x="50" y="110" width="140" height="180" rx="8" fill="#1E1B4B" stroke="#F43F5E" stroke-width="2" stroke-dasharray="4 4"/>
  <circle cx="120" cy="170" r="40" fill="#475569"/>
  <path d="M75 270 C 75 220, 165 220, 165 270 Z" fill="#64748B"/>
  <rect x="45" y="105" width="150" height="190" fill="#F43F5E" fill-opacity="0.15"/>
  <text x="55" y="125" fill="#F43F5E" font-family="monospace" font-size="10" font-weight="bold">[PHOTO OVERLAY DETECTED]</text>

  <!-- Details Fields -->
  <text x="210" y="130" fill="#64748B" font-family="monospace" font-size="11">FULL NAME</text>
  <!-- Altered font size/weight -->
  <rect x="205" y="135" width="180" height="25" fill="#F59E0B" fill-opacity="0.2" stroke="#F59E0B"/>
  <text x="210" y="153" fill="#FDE68A" font-family="Arial" font-size="18" font-weight="900">MARCUS V. REYES</text>

  <text x="210" y="180" fill="#64748B" font-family="monospace" font-size="11">LICENSE NO.</text>
  <text x="210" y="200" fill="#F8FAFC" font-family="monospace" font-size="16" font-weight="bold">DL-9938102-X</text>

  <text x="210" y="230" fill="#64748B" font-family="monospace" font-size="11">DATE OF BIRTH</text>
  <rect x="205" y="235" width="130" height="25" fill="#F43F5E" fill-opacity="0.2" stroke="#F43F5E"/>
  <text x="210" y="253" fill="#FECDD3" font-family="Courier" font-size="15">01/12/1995</text>

  <text x="380" y="230" fill="#64748B" font-family="monospace" font-size="11">EXPIRY DATE</text>
  <text x="380" y="250" fill="#F8FAFC" font-family="sans-serif" font-size="14">12/31/2028</text>

  <!-- Barcode / PDF417 Region -->
  <rect x="400" y="110" width="150" height="90" rx="4" fill="#090D16" stroke="#F43F5E"/>
  <text x="410" y="140" fill="#F43F5E" font-family="monospace" font-size="10">[PDF417 2D BARCODE]</text>
  <text x="410" y="160" fill="#FB7185" font-family="monospace" font-size="9">ANSI 6360010100</text>
  <text x="410" y="180" fill="#FB7185" font-family="monospace" font-size="9">PAYLOAD: REYES, M</text>
</svg>
`)}`;

const faceSample1 = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" fill="none">
  <rect width="300" height="300" rx="16" fill="#0F172A"/>
  <circle cx="150" cy="120" r="60" fill="#38BDF8" fill-opacity="0.2" stroke="#38BDF8" stroke-width="3"/>
  <circle cx="130" cy="110" r="8" fill="#0EA5E9"/>
  <circle cx="170" cy="110" r="8" fill="#0EA5E9"/>
  <path d="M150 115 L145 135 L155 135 Z" stroke="#38BDF8" stroke-width="2" fill="none"/>
  <path d="M130 150 Q150 165 170 150" stroke="#38BDF8" stroke-width="3" fill="none"/>
  <path d="M60 270 C 60 200, 240 200, 240 270 Z" fill="#1E293B" stroke="#0EA5E9" stroke-width="2"/>
</svg>
`)}`;

const faceSample2 = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" fill="none">
  <rect width="300" height="300" rx="16" fill="#1E1B4B"/>
  <circle cx="150" cy="120" r="60" fill="#F43F5E" fill-opacity="0.15" stroke="#F43F5E" stroke-width="3"/>
  <circle cx="130" cy="110" r="8" fill="#FB7185"/>
  <circle cx="170" cy="110" r="8" fill="#FB7185"/>
  <path d="M150 115 L145 135 L155 135 Z" stroke="#FB7185" stroke-width="2" fill="none"/>
  <path d="M135 155 L165 155" stroke="#FB7185" stroke-width="3" fill="none"/>
  <path d="M60 270 C 60 200, 240 200, 240 270 Z" fill="#312E81" stroke="#F43F5E" stroke-width="2"/>
</svg>
`)}`;

export const SAMPLE_CASES: SampleCase[] = [
  {
    id: 'CASE-2026-8801',
    name: 'Alexander James Valentine',
    documentType: 'Cyberia Diplomatic Passport',
    expectedStatus: 'LOW',
    docAnalysis: {
      documentId: 'DOC-CYB-9842',
      documentType: 'PASSPORT',
      fileName: 'passport_alexander_val.png',
      uploadTimestamp: '2026-08-28 19:42:01 UTC',
      imageUrl: passportSvgDataUri,
      tamperingScore: 4.2,
      compositeRiskScore: 6.5,
      status: 'LOW',
      finalDecision: 'VERIFIED',
      evidenceSha256: '4f938b81297e2ab74e6f9872c9a1098ef3051a84f32c25607e0c4a45a33c1d9b',
      analysisMethods: [
        {
          name: 'Error Level Analysis (ELA)',
          description: 'Measures compression variance across image blocks to detect copy-paste overlays.',
          passed: true,
          confidence: 98.6,
        },
        {
          name: 'RapidOCR Identity Text Parser',
          description: 'Extracts printed name, DOB, ID number with local ONNX model.',
          passed: true,
          confidence: 97.4,
        },
        {
          name: 'ICAO 9303 MRZ Checksum Validator',
          description: 'Verifies ICAO 9303 standard optical character recognition and 7-3-1 checksum math.',
          passed: true,
          confidence: 100.0,
        },
        {
          name: 'zxing-cpp QR / Barcode Scanner',
          description: 'Decodes document 2D barcodes and cross-validates with visual OCR.',
          passed: true,
          confidence: 98.0,
        },
      ],
      suspiciousRegions: [],
      detectedText: [
        { field: 'Surname', value: 'VALENTINE', isConsistent: true },
        { field: 'Given Names', value: 'ALEXANDER JAMES', isConsistent: true },
        { field: 'Document No.', value: 'CY-9842011A', isConsistent: true },
        { field: 'Date of Birth', value: '14 APR 1988', isConsistent: true },
        { field: 'Expiry Date', value: '22 OCT 2031', isConsistent: true },
      ],
      suspiciousReasons: [],
      ocr: {
        isReadable: true,
        overallConfidence: 97.4,
        rawText: "PASSPORT / PASSEPORT - REPUBLIC OF CYBERIA\nSURNAME: VALENTINE\nGIVEN NAMES: ALEXANDER JAMES\nNATIONALITY: CYBERIAN (CYB)\nDATE OF BIRTH: 14 APR 1988\nPASSPORT NO: CY-9842011A\nEXPIRY DATE: 22 OCT 2031\nP<CYBVALENTINE<<ALEXANDER<JAMES<<<<<<<<<<<<\nCY9842011A4CYB8804148M3110222<<<<<<<<<<<<<<06",
        lines: [
          { text: "PASSPORT / PASSEPORT - REPUBLIC OF CYBERIA", confidence: 99.1 },
          { text: "SURNAME: VALENTINE", confidence: 98.4 },
          { text: "GIVEN NAMES: ALEXANDER JAMES", confidence: 97.8 },
          { text: "NATIONALITY: CYBERIAN (CYB)", confidence: 96.5 },
          { text: "DATE OF BIRTH: 14 APR 1988", confidence: 98.0 },
          { text: "PASSPORT NO: CY-9842011A", confidence: 99.2 },
          { text: "EXPIRY DATE: 22 OCT 2031", confidence: 97.5 },
        ],
        fields: {
          documentType: "PASSPORT",
          name: "VALENTINE ALEXANDER JAMES",
          dob: "14 APR 1988",
          docNumber: "CY-9842011A",
          expiryDate: "22 OCT 2031",
          nationality: "CYB",
          gender: "MALE",
        },
        detectedFieldCount: 5,
        warning: null,
      },
      mrz: {
        mrzDetected: true,
        isApplicable: true,
        status: "VERIFIED",
        format: "TD3 (Passport / 44 Chars)",
        rawLines: [
          "P<CYBVALENTINE<<ALEXANDER<JAMES<<<<<<<<<<<<",
          "CY9842011A4CYB8804148M3110222<<<<<<<<<<<<<<06"
        ],
        parsedFields: {
          documentType: "P",
          issuingCountry: "CYB",
          surname: "VALENTINE",
          givenNames: "ALEXANDER JAMES",
          documentNumber: "CY9842011A",
          nationality: "CYB",
          dob: "1988-04-14",
          dobRaw: "880414",
          sex: "MALE",
          expiryDate: "2031-10-22",
          expiryRaw: "311022",
        },
        checksums: [
          { name: "Document Number Checksum", field: "doc_number", data: "CY9842011A", expected: "4", calculated: "4", valid: true, description: "Validates 9-digit passport number" },
          { name: "Date of Birth Checksum", field: "dob", data: "880414", expected: "8", calculated: "8", valid: true, description: "Validates holder birth date" },
          { name: "Expiry Date Checksum", field: "expiry_date", data: "311022", expected: "2", calculated: "2", valid: true, description: "Validates document expiry date" },
          { name: "Overall Composite Checksum", field: "composite", data: "Composite Block", expected: "06", calculated: "06", valid: true, description: "Validates TD3 full line checksum" },
        ],
        allChecksumsValid: true,
        message: "ICAO 9303 TD3 Passport MRZ Verified (4/4 Checksums Passed).",
      },
      barcode: {
        detected: false,
        status: "NOT_FOUND",
        count: 0,
        statusDetail: "No QR Code or 1D/2D Barcode detected on document surface.",
        isGenuineProofWarning: "Decoding a barcode only verifies data encoding; physical security features still apply.",
        comparisonResults: [],
        barcodes: [],
      }
    },
    faceVerification: {
      documentFaceUrl: faceSample1,
      liveCapturedFaceUrl: faceSample1,
      similarityScore: 96.8,
      matchConfidence: 99.4,
      faceDetected: true,
      facialLandmarksCount: 68,
      status: 'LOW',
      details: [
        { metric: 'Facial Landmark Alignment', score: 98.4, status: 'PASS' },
        { metric: 'Inter-Pupillary Distance Ratio', score: 96.1, status: 'PASS' },
        { metric: '3D Depth & Reflection Contour', score: 95.9, status: 'PASS' },
      ],
    },
    riskDecision: {
      caseId: 'CASE-2026-8801',
      applicantName: 'Alexander James Valentine',
      documentType: 'Cyberia Diplomatic Passport',
      timestamp: '2026-08-28 19:42:15 UTC',
      overallRiskScore: 6.5,
      overallStatus: 'LOW',
      finalDecision: 'VERIFIED',
      recommendedAction: 'PASS',
      evidenceSha256: '4f938b81297e2ab74e6f9872c9a1098ef3051a84f32c25607e0c4a45a33c1d9b',
      breakdown: {
        documentTampering: {
          id: 'b1',
          name: 'Document Tampering Risk',
          score: 4.2,
          status: 'LOW',
          weight: 35,
          details: 'Zero ELA anomalies; document layout complies strictly with ICAO standards.',
        },
        dataConsistency: {
          id: 'b2',
          name: 'Data Consistency Risk',
          score: 2.0,
          status: 'LOW',
          weight: 20,
          details: 'Visual Text Zone matches Machine Readable Zone checksums 100%.',
        },
        faceMatch: {
          id: 'b3',
          name: 'Face Match Similarity Risk',
          score: 3.2,
          status: 'LOW',
          weight: 25,
          details: 'Biometric face match score is 96.8% (Well above 80% threshold).',
        },
        liveness: {
          id: 'b4',
          name: 'Active Liveness Verification Risk',
          score: 5.0,
          status: 'LOW',
          weight: 15,
          details: 'Passed active blink and head rotation challenges in 4.2 seconds.',
        },
        imageQuality: {
          id: 'b5',
          name: 'Image Quality & Resolution',
          score: 8.1,
          status: 'LOW',
          weight: 5,
          details: 'High resolution scan (300 DPI equivalent), crisp illumination.',
        },
      },
      reasons: [
        {
          id: 'r1',
          title: 'High Biometric Facial Similarity',
          category: 'FACE',
          severity: 'LOW',
          impactScore: -40,
          featureWeight: 96,
          description: 'Live selfie capture matches ID document portrait with 96.8% similarity index.',
          evidence: 'Vector distance: 0.12 in 128D embedding space.',
          sourceModule: 'Module 7: Face Match Engine',
        },
        {
          id: 'r2',
          title: 'Authentic ICAO 9303 MRZ Checksums',
          category: 'MRZ',
          severity: 'LOW',
          impactScore: -30,
          featureWeight: 100,
          description: 'All document numbers, DOB, and expiry date check digits validated successfully.',
          evidence: 'Full match between OCR visual zone and MRZ string.',
          sourceModule: 'Module 6: Forensics Engine',
        },
        {
          id: 'r3',
          title: 'Clean Error Level Analysis (ELA)',
          category: 'DOCUMENT',
          severity: 'LOW',
          impactScore: -25,
          featureWeight: 94,
          description: 'Uniform compression characteristics with zero copy-move boundary anomalies.',
          evidence: 'ELA variance: 2.1 (Threshold: 35.0).',
          sourceModule: 'Module 6: Forensics Engine',
        },
      ],
    },
  },
  {
    id: 'CASE-2026-9942',
    name: 'Marcus V. Reyes',
    documentType: 'State of Pacifica Driver License',
    expectedStatus: 'HIGH',
    docAnalysis: {
      documentId: 'DOC-PAC-3391',
      documentType: 'DRIVER_LICENSE',
      fileName: 'driver_license_tampered.png',
      uploadTimestamp: '2026-08-28 19:50:33 UTC',
      imageUrl: tamperedPassportSvgDataUri,
      tamperingScore: 84.7,
      compositeRiskScore: 87.4,
      status: 'HIGH',
      finalDecision: 'HIGH RISK',
      evidenceSha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
      analysisMethods: [
        {
          name: 'Error Level Analysis (ELA)',
          description: 'Measures compression variance across image blocks to detect copy-paste overlays.',
          passed: false,
          confidence: 94.2,
        },
        {
          name: 'RapidOCR Identity Text Parser',
          description: 'Extracts printed name, DOB, ID number with local ONNX model.',
          passed: false,
          confidence: 86.5,
        },
        {
          name: 'ICAO 9303 MRZ Checksum Validator',
          description: 'Verifies ICAO standard optical character recognition and checksum math.',
          passed: true,
          confidence: 100.0,
        },
        {
          name: 'zxing-cpp QR / Barcode Scanner',
          description: 'Decodes document 2D barcodes and cross-validates with visual OCR.',
          passed: false,
          confidence: 99.2,
        },
      ],
      suspiciousRegions: [
        {
          id: 'sr1',
          title: 'Photo Splicing Overlay Detected',
          description: 'Discontinuity in compression noise around the photo boundary indicates digital replacement.',
          severity: 'HIGH',
          type: 'ELA_ARTIFACT',
          boundingBox: { x: 8, y: 27, width: 24, height: 46 },
        },
        {
          id: 'sr2',
          title: 'Typography & Font Mismatch',
          description: 'Field "MARCUS V. REYES" uses non-standard font family and altered character baseline.',
          severity: 'HIGH',
          type: 'FONT_MISMATCH',
          boundingBox: { x: 34, y: 33, width: 31, height: 8 },
        },
        {
          id: 'sr3',
          title: 'DOB Field Digit Tampering',
          description: 'Resampling artifacts detected around date digits "01/12/1995".',
          severity: 'MEDIUM',
          type: 'COPY_MOVE',
          boundingBox: { x: 34, y: 58, width: 23, height: 7 },
        },
      ],
      detectedText: [
        { field: 'Full Name', value: 'MARCUS V. REYES', isConsistent: false },
        { field: 'License No.', value: 'DL-9938102-X', isConsistent: true },
        { field: 'Date of Birth', value: '01/12/1995', isConsistent: false },
        { field: 'Expiry Date', value: '12/31/2028', isConsistent: true },
      ],
      suspiciousReasons: [
        'Photo boundary compression delta exceeds 42% threshold (Digital photo splicing).',
        'Name string typography fails state font template (Arial 18pt bold detected vs custom License Sans).',
        'PDF417 barcode payload name conflicts with printed visual name (JOHN DOE vs MARCUS REYES).',
        'EXIF header reveals Adobe Photoshop CS6 editing signature.',
      ],
      ocr: {
        isReadable: true,
        overallConfidence: 86.5,
        rawText: "DRIVER LICENSE - STATE OF PACIFICA\nFULL NAME: MARCUS V. REYES\nLICENSE NO: DL-9938102-X\nDATE OF BIRTH: 01/12/1995\nEXPIRY DATE: 12/31/2028",
        lines: [
          { text: "DRIVER LICENSE - STATE OF PACIFICA", confidence: 98.0 },
          { text: "FULL NAME: MARCUS V. REYES", confidence: 82.1 },
          { text: "LICENSE NO: DL-9938102-X", confidence: 96.0 },
          { text: "DATE OF BIRTH: 01/12/1995", confidence: 79.5 },
          { text: "EXPIRY DATE: 12/31/2028", confidence: 95.0 },
        ],
        fields: {
          documentType: "DRIVER_LICENSE",
          name: "MARCUS V. REYES",
          dob: "01/12/1995",
          docNumber: "DL-9938102-X",
          expiryDate: "12/31/2028",
        },
        detectedFieldCount: 4,
        warning: "Low character confidence on name & DOB fields; possible resampling or font alteration.",
      },
      mrz: {
        mrzDetected: false,
        isApplicable: false,
        status: "NOT_APPLICABLE",
        format: "NONE",
        rawLines: [],
        parsedFields: {},
        checksums: [],
        allChecksumsValid: true,
        message: "MRZ Not Applicable: Driver license document does not contain an ICAO Machine Readable Zone.",
      },
      barcode: {
        detected: true,
        status: "MISMATCH",
        count: 1,
        primaryFormat: "PDF417",
        statusDetail: "Data Mismatch! Decoded PDF417 payload conflicts with printed OCR name and DOB.",
        isGenuineProofWarning: "Successfully decoding a barcode does not prove physical authenticity.",
        payloadSummary: "ANSI 6360010100DL00390212ZQ02600025DLDAQJOHN DOE, DOB: 05/18/1989, DL: DL-9938102-X",
        comparisonResults: [
          { field: "Applicant Name", ocrValue: "MARCUS V. REYES", barcodeValue: "JOHN DOE", isMatch: false, severity: "HIGH" },
          { field: "Date of Birth", ocrValue: "01/12/1995", barcodeValue: "05/18/1989", isMatch: false, severity: "HIGH" },
          { field: "License Number", ocrValue: "DL-9938102-X", barcodeValue: "DL-9938102-X", isMatch: true, severity: "LOW" },
        ],
        barcodes: [
          {
            format: "PDF417",
            rawText: "ANSI 6360010100DL00390212ZQ02600025DLDAQJOHN DOE, DOB: 05/18/1989, DL: DL-9938102-X",
            isValid: true,
          }
        ]
      }
    },
    faceVerification: {
      documentFaceUrl: faceSample1,
      liveCapturedFaceUrl: faceSample2,
      similarityScore: 42.1,
      matchConfidence: 88.0,
      faceDetected: true,
      facialLandmarksCount: 68,
      status: 'HIGH',
      details: [
        { metric: 'Facial Landmark Alignment', score: 41.2, status: 'FAIL' },
        { metric: 'Inter-Pupillary Distance Ratio', score: 45.9, status: 'FAIL' },
        { metric: '3D Depth & Reflection Contour', score: 68.0, status: 'WARN' },
      ],
    },
    riskDecision: {
      caseId: 'CASE-2026-9942',
      applicantName: 'Marcus V. Reyes',
      documentType: 'State of Pacifica Driver License',
      timestamp: '2026-08-28 19:50:50 UTC',
      overallRiskScore: 87.4,
      overallStatus: 'HIGH',
      finalDecision: 'HIGH RISK',
      recommendedAction: 'REJECT',
      evidenceSha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
      breakdown: {
        documentTampering: {
          id: 'b1',
          name: 'Document Tampering Risk',
          score: 84.7,
          status: 'HIGH',
          weight: 35,
          details: 'High-confidence photo splicing & font alteration detected in visual zone.',
        },
        dataConsistency: {
          id: 'b2',
          name: 'Data Consistency Risk',
          score: 89.0,
          status: 'HIGH',
          weight: 20,
          details: 'Severe mismatch between PDF417 barcode payload (JOHN DOE) and printed text (MARCUS REYES).',
        },
        faceMatch: {
          id: 'b3',
          name: 'Face Match Similarity Risk',
          score: 88.5,
          status: 'HIGH',
          weight: 25,
          details: 'Biometric face match score is only 42.1% (Fails minimum 75% threshold).',
        },
        liveness: {
          id: 'b4',
          name: 'Active Liveness Verification Risk',
          score: 62.0,
          status: 'MEDIUM',
          weight: 15,
          details: 'Repeated timeout on head turn prompt; potential presentation attack.',
        },
        imageQuality: {
          id: 'b5',
          name: 'Image Quality & Resolution',
          score: 22.0,
          status: 'LOW',
          weight: 5,
          details: 'Adequate lighting and resolution.',
        },
      },
      reasons: [
        {
          id: 'r10',
          title: 'Digital Photo Splicing Detected',
          category: 'DOCUMENT',
          severity: 'HIGH',
          impactScore: 85,
          featureWeight: 92,
          description: 'High error level analysis (ELA) variance around photo boundary indicates the document portrait was replaced.',
          evidence: 'Boundary gradient delta = +48.2 (Threshold: 15.0)',
          sourceModule: 'Module 6: AI Document Forensics',
        },
        {
          id: 'r11',
          title: 'PDF417 Barcode Credential Mismatch',
          category: 'BARCODE',
          severity: 'HIGH',
          impactScore: 90,
          featureWeight: 94,
          description: 'Decoded PDF417 2D barcode contains conflicting name "JOHN DOE" vs printed "MARCUS V. REYES".',
          evidence: 'Payload: DAQJOHN DOE vs OCR: MARCUS V. REYES',
          sourceModule: 'Module 6: 2D Barcode Scanner',
        },
        {
          id: 'r12',
          title: 'Severe Biometric Face Mismatch',
          category: 'FACE',
          severity: 'HIGH',
          impactScore: 88,
          featureWeight: 95,
          description: 'Live applicant facial embedding vector deviates significantly from the document portrait image.',
          evidence: 'Facial similarity 42.1% vs 75.0% minimum threshold.',
          sourceModule: 'Module 7: Face Match Engine',
        },
        {
          id: 'r13',
          title: 'Font & Baseline Alignment Anomaly',
          category: 'OCR',
          severity: 'HIGH',
          impactScore: 70,
          featureWeight: 82,
          description: 'Name text font kerning and height do not match standard state license template fonts.',
          evidence: 'Detected font: Arial Black, Baseline skew: 1.8deg.',
          sourceModule: 'Module 6: RapidOCR Inspector',
        },
      ],
    },
  },
];
