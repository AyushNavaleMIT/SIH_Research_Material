export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ScreeningStage = 
  | 'DOC_ANALYSIS'
  | 'FACE_VERIFY'
  | 'LIVENESS_CHECK'
  | 'RISK_ANALYSIS'
  | 'FINAL_DECISION';

export type ActionRecommendation = 'PASS' | 'MANUAL_REVIEW' | 'REJECT';

export type FinalDecisionState = 'VERIFIED' | 'SUSPICIOUS' | 'HIGH RISK';

export interface SuspiciousRegion {
  id: string;
  title: string;
  description: string;
  severity: RiskLevel;
  type: 'FONT_MISMATCH' | 'ELA_ARTIFACT' | 'COPY_MOVE' | 'EXIF_TAMPERING' | 'EDGE_DISCONTINUITY';
  boundingBox: {
    x: number; // percentage
    y: number;
    width: number;
    height: number;
  };
}

export interface OcrExtractedFields {
  documentType?: string;
  name?: string | null;
  dob?: string | null;
  docNumber?: string | null;
  expiryDate?: string | null;
  issueDate?: string | null;
  address?: string | null;
  gender?: string | null;
  nationality?: string | null;
}

export interface OcrLineItem {
  text: string;
  confidence: number;
  box?: number[][];
}

export interface OcrResult {
  isReadable: boolean;
  overallConfidence: number; // 0 - 100
  rawText: string;
  lines: OcrLineItem[];
  fields: OcrExtractedFields;
  detectedFieldCount: number;
  warning?: string | null;
}

export interface MrzChecksumItem {
  name: string;
  field: string;
  data: string;
  expected: string;
  calculated: string;
  valid: boolean;
  description: string;
}

export interface MrzValidationResult {
  mrzDetected: boolean;
  isApplicable: boolean;
  status: 'VERIFIED' | 'FAILED' | 'NOT_APPLICABLE' | 'INVALID';
  format: string;
  rawLines: string[];
  parsedFields: {
    documentType?: string | null;
    issuingCountry?: string | null;
    surname?: string | null;
    givenNames?: string | null;
    documentNumber?: string | null;
    nationality?: string | null;
    dob?: string | null;
    dobRaw?: string | null;
    sex?: string | null;
    expiryDate?: string | null;
    expiryRaw?: string | null;
    optionalData?: string | null;
  };
  checksums: MrzChecksumItem[];
  allChecksumsValid: boolean;
  message: string;
}

export interface BarcodeComparisonItem {
  field: string;
  ocrValue: string;
  barcodeValue: string;
  isMatch: boolean;
  severity: RiskLevel;
}

export interface DecodedBarcodeItem {
  format: string;
  rawText: string;
  isValid: boolean;
  position?: {
    topLeft: [number, number];
    bottomRight: [number, number];
  } | null;
}

export interface BarcodeVerificationResult {
  detected: boolean;
  status: 'MATCH' | 'MISMATCH' | 'INVALID' | 'NOT_FOUND';
  count: number;
  primaryFormat?: string;
  barcodes: DecodedBarcodeItem[];
  comparisonResults: BarcodeComparisonItem[];
  statusDetail: string;
  isGenuineProofWarning?: string;
  payloadSummary?: string | null;
}

export interface CybercrimeReport {
  caseId: string;
  reportTitle: string;
  generatedTimestamp: string;
  submissionPortal: {
    name: string;
    officialUrl: string;
    nationalHelpline: string;
    jurisdiction?: string;
    submissionStatus: string;
    submissionNotice: string;
  };
  evidenceFile: {
    filename: string;
    sizeBytes: number;
    sha256Digest: string;
    mimeType: string;
  };
  screeningVerdict: {
    finalDecision: FinalDecisionState | string;
    riskLevel: RiskLevel;
    compositeRiskScore: number;
    tamperingScore: number;
    recommendedAction: string;
  };
  pdfDownloadUrl?: string;
  jsonDownloadUrl?: string;
  analystNotes?: string;
}

export interface DocumentAnalysisResult {
  documentId: string;
  documentType: 'PASSPORT' | 'DRIVER_LICENSE' | 'NATIONAL_ID';
  fileName: string;
  uploadTimestamp: string;
  imageUrl: string;
  tamperingScore: number; // 0 - 100
  compositeRiskScore?: number;
  status: RiskLevel;
  finalDecision?: FinalDecisionState;
  evidenceSha256?: string;
  analysisMethods: {
    name: string;
    description: string;
    passed: boolean;
    confidence: number;
  }[];
  suspiciousRegions: SuspiciousRegion[];
  detectedText: {
    field: string;
    value: string;
    isConsistent: boolean;
  }[];
  suspiciousReasons: string[];
  ocr?: OcrResult;
  mrz?: MrzValidationResult;
  barcode?: BarcodeVerificationResult;
}

export interface FaceVerificationResult {
  documentFaceUrl: string;
  liveCapturedFaceUrl: string;
  similarityScore: number; // 0 - 100
  matchConfidence: number;
  faceDetected: boolean;
  facialLandmarksCount: number;
  status: RiskLevel;
  details: {
    metric: string;
    score: number;
    status: 'PASS' | 'WARN' | 'FAIL';
  }[];
}

export type LivenessChallengeStep = 
  | 'DETECT_FACE'
  | 'BLINK_TWICE'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'COMPLETE';

export interface RiskBreakdownItem {
  id: string;
  name: string;
  score: number; // 0 - 100 (0 = safe, 100 = high risk)
  status: RiskLevel;
  weight: number; // percentage weight in decision
  details: string;
}

export interface ExplainableReason {
  id: string;
  title: string;
  category: 'DOCUMENT' | 'FACE' | 'LIVENESS' | 'CONSISTENCY' | 'QUALITY' | 'OCR' | 'MRZ' | 'BARCODE';
  severity: RiskLevel;
  impactScore: number; // -100 to +100 or relative weight percentage
  featureWeight: number; // 0 - 100
  description: string;
  evidence: string;
  sourceModule: string;
}

export interface AggregatedRiskDecision {
  caseId: string;
  applicantName: string;
  documentType: string;
  timestamp: string;
  overallRiskScore: number; // 0 - 100
  overallStatus: RiskLevel;
  finalDecision?: FinalDecisionState;
  recommendedAction: ActionRecommendation;
  evidenceSha256?: string;
  analystOverride?: {
    action: ActionRecommendation;
    analystName: string;
    timestamp: string;
    notes: string;
  };
  breakdown: {
    documentTampering: RiskBreakdownItem;
    dataConsistency: RiskBreakdownItem;
    faceMatch: RiskBreakdownItem;
    liveness: RiskBreakdownItem;
    imageQuality: RiskBreakdownItem;
  };
  reasons: ExplainableReason[];
}

export interface SampleCase {
  id: string;
  name: string;
  documentType: string;
  expectedStatus: RiskLevel;
  docAnalysis: DocumentAnalysisResult;
  faceVerification: FaceVerificationResult;
  riskDecision: AggregatedRiskDecision;
}
