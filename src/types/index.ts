export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'NEUTRAL';

export type ScreeningStage = 
  | 'DOC_ANALYSIS'
  | 'FACE_VERIFY'
  | 'LIVENESS_CHECK'
  | 'RISK_ANALYSIS'
  | 'FINAL_DECISION';

export type StepStatus = 'LOCKED' | 'READY' | 'PROCESSING' | 'PASSED' | 'FAILED' | 'COMPLETED' | 'RECAPTURE_REQUIRED';

export type ActionRecommendation = 'PASS' | 'MANUAL_REVIEW' | 'REJECT';

export type FinalDecisionState = 'VERIFIED' | 'SUSPICIOUS' | 'HIGH RISK' | 'RECAPTURE REQUIRED';

export interface PipelineState {
  DOC_ANALYSIS: StepStatus;
  FACE_VERIFY: StepStatus;
  LIVENESS_CHECK: StepStatus;
  RISK_ANALYSIS: StepStatus;
  FINAL_DECISION: StepStatus;
}

export interface QualityGateMetrics {
  resolution: string;
  blur_score: number;
  tenengrad_sharpness?: number;
  mean_luminance: number;
  contrast_std: number;
  glare_ratio_pct: number;
  glare_applicable?: boolean;
  blur_applicable?: boolean;
  skew_angle_deg: number;
  cropped_edges?: string[];
  source_type?: string;
  source_display?: string;
}

export interface QualityGateResult {
  passed: boolean;
  status: 'PASSED' | 'RECAPTURE_REQUIRED';
  source_type?: string;
  source_display?: string;
  is_digital?: boolean;
  has_critical_issues: boolean;
  issues: string[];
  warnings: string[];
  recommendation: string;
  metrics: QualityGateMetrics;
}

export interface SuspiciousRegion {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  type: 'FONT_MISMATCH' | 'ELA_ARTIFACT' | 'COPY_MOVE' | 'EXIF_TAMPERING' | 'EDGE_DISCONTINUITY';
  boundingBox: {
    x: number; // percentage
    y: number;
    width: number;
    height: number;
  };
}

export interface AadhaarValidationResult {
  is_aadhaar: boolean;
  document_type: string;
  status: 'VERIFIED' | 'SUSPICIOUS' | 'INVALID';
  aadhaar_number: string | null;
  masked_aadhaar: string | null;
  is_verhoeff_valid: boolean;
  structure_checks: {
    name: string;
    passed: boolean;
    details: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }[];
  disclaimer: string;
}

export interface PanValidationResult {
  is_pan: boolean;
  document_type: string;
  status: string;
  pan_number?: string;
  entity_type?: string;
  structure_checks?: {
    name: string;
    passed: boolean;
    details: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }[];
  disclaimer?: string;
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
  aadhaar_validation?: AadhaarValidationResult | null;
  pan_validation?: PanValidationResult | null;
  warning?: string | null;
  recapture_required?: boolean;
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
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
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
  aadhaar_qr_data?: any;
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
  documentType: 'PASSPORT' | 'DRIVER_LICENSE' | 'NATIONAL_ID' | 'NATIONAL_ID (AADHAAR)' | 'NATIONAL_ID (PAN)' | string;
  source_type?: 'PHYSICAL_CAPTURE' | 'SCANNED_DOCUMENT' | 'DIGITAL_PDF' | 'DIGITAL_IMAGE' | 'SCREENSHOT' | string;
  source_display?: string;
  is_digital?: boolean;
  fileName: string;
  uploadTimestamp: string;
  imageUrl: string;
  tamperingScore: number; // 0 - 100
  compositeRiskScore?: number;
  status: RiskLevel;
  finalDecision?: FinalDecisionState;
  recaptureRequired?: boolean;
  qualityGate?: QualityGateResult;
  evidenceSha256?: string;
  isDemo?: boolean;
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
  evidenceSignals?: Record<string, string>;
  ocr?: OcrResult;
  mrz?: MrzValidationResult;
  barcode?: BarcodeVerificationResult;
  aadhaarValidation?: AadhaarValidationResult | null;
  panValidation?: PanValidationResult | null;
}

export interface FaceVerificationResult {
  success: boolean;
  status: 'PASSED' | 'FAILED';
  riskStatus?: RiskLevel;
  documentFaceUrl: string;
  liveCapturedFaceUrl: string;
  similarityScore: number; // 0 - 100
  matchConfidence: number;
  faceDetected: boolean;
  docFaceDetected?: boolean;
  selfieFaceDetected?: boolean;
  facialLandmarksCount?: number;
  vectorDistance?: number;
  cosineScore?: number;
  errorCode?: string | null;
  message?: string;
  isDemo?: boolean;
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

export interface LivenessResult {
  success: boolean;
  status: 'PASSED' | 'FAILED';
  completedStepsCount: number;
  totalStepsCount: number;
  spoofScore?: number;
  message?: string;
  isDemo?: boolean;
}

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
  isDemo?: boolean;
  recapture_required?: boolean;
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

export type UserRole = 'INDIVIDUAL' | 'ORGANISATION' | 'ADMIN';
export type OrganisationType = 'BANK' | 'HOSPITAL' | 'COMPANY' | 'EDUCATIONAL' | 'AUTHORIZED_AGENCY';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  fullName?: string;
  orgName?: string;
  orgId?: string;
  orgType?: OrganisationType;
  authorizedPerson?: string;
  createdAt?: string;
}

export interface VerificationHistoryRecord {
  case_id: string;
  owner_id: string;
  owner_email: string;
  owner_role: UserRole;
  org_name?: string;
  timestamp: string;
  applicant_name: string;
  document_type: string;
  source_display: string;
  final_decision: FinalDecisionState;
  overall_risk_score: number;
  overall_status: RiskLevel;
  evidence_sha256: string;
  reasons: string[];
  liveness_passed: boolean;
  face_similarity: number;
  ocr_fields: {
    name: string;
    docNumber: string;
    dob: string;
    gender: string;
    address: string;
  };
}
