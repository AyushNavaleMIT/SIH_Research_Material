import React, { useState, useRef, useCallback } from 'react';
import { 
  RefreshCw, 
  FileDown, 
  Award, 
  UserCheck, 
  ShieldAlert, 
  ExternalLink, 
  Fingerprint,
  Smile,
  FileText
} from 'lucide-react';
import type { 
  ScreeningStage, 
  PipelineState, 
  DocumentAnalysisResult, 
  FaceVerificationResult, 
  AggregatedRiskDecision, 
  SampleCase, 
  FinalDecisionState 
} from '../types';
import { EMPTY_DOC_RESULT, EMPTY_RISK_DECISION } from '../data/mockData';
import { Stepper } from '../components/Stepper';
import { DocumentForensics } from './DocumentForensics';
import { FaceVerification } from './FaceVerification';
import { LivenessChallenge } from '../components/LivenessChallenge';
import { RiskDashboard } from './RiskDashboard';
import { CybercrimeReportModal } from '../components/CybercrimeReportModal';
import { ScreeningApiService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface UnifiedWorkflowProps {
  initialCase?: SampleCase;
  currentCase?: SampleCase;
  sampleCases?: SampleCase[];
  onCaseChange?: (sampleCase: SampleCase) => void;
  onSelectSample?: (caseId: string) => void;
}

interface VerdictInfo {
  decision: FinalDecisionState;
  color: string;
  badgeColor: string;
  summary: string;
  recommendedAction: string;
  reasons: string[];
}

export const UnifiedWorkflow: React.FC<UnifiedWorkflowProps> = ({
  initialCase,
  currentCase,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const activeInitial = currentCase || initialCase;
  const [activeStage, setActiveStage] = useState<ScreeningStage>('DOC_ANALYSIS');
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    DOC_ANALYSIS: 'READY',
    LIVENESS_CHECK: 'LOCKED',
    FACE_VERIFY: 'LOCKED',
    RISK_ANALYSIS: 'LOCKED',
    FINAL_DECISION: 'LOCKED',
  });

  const [docResult, setDocResult] = useState<DocumentAnalysisResult>(
    activeInitial?.docAnalysis || EMPTY_DOC_RESULT
  );
  const [faceResult, setFaceResult] = useState<FaceVerificationResult | undefined>(
    activeInitial?.faceVerification || undefined
  );
  const [livenessPassed, setLivenessPassed] = useState<boolean>(false);
  const [riskDecision, setRiskDecision] = useState<AggregatedRiskDecision>(
    activeInitial?.riskDecision || EMPTY_RISK_DECISION
  );

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Active Stage Ref to guard against asynchronous race conditions
  const activeStageRef = useRef<ScreeningStage>('DOC_ANALYSIS');
  activeStageRef.current = activeStage;

  // Strict Safe Stage Transition Guard:
  // Once in FINAL_DECISION, NO automatic callback or function can revert the stage.
  const setStageSafely = useCallback((newStage: ScreeningStage, source: string) => {
    if (activeStageRef.current === 'FINAL_DECISION') {
      console.warn(`[PIPELINE BLOCKED] Step 5 Final Report is actively locked. Transition to "${newStage}" from "${source}" was BLOCKED.`);
      return;
    }
    console.log(`[PIPELINE] Stage transitioning: ${activeStageRef.current} -> ${newStage} (Source: ${source})`);
    activeStageRef.current = newStage;
    setActiveStage(newStage);
  }, []);

  // Prerequisite Access Policy: Allows operator to review earlier stages
  const canAccessStage = (stage: ScreeningStage): boolean => {
    switch (stage) {
      case 'DOC_ANALYSIS':
        return true;
      case 'LIVENESS_CHECK':
        return (
          pipelineState.DOC_ANALYSIS === 'PASSED' ||
          pipelineState.DOC_ANALYSIS === 'FAILED'
        );
      case 'FACE_VERIFY':
        return (
          (pipelineState.DOC_ANALYSIS === 'PASSED' || pipelineState.DOC_ANALYSIS === 'FAILED') &&
          (pipelineState.LIVENESS_CHECK === 'PASSED' || pipelineState.LIVENESS_CHECK === 'FAILED')
        );
      case 'RISK_ANALYSIS':
        return (
          (pipelineState.DOC_ANALYSIS === 'PASSED' || pipelineState.DOC_ANALYSIS === 'FAILED') &&
          (pipelineState.FACE_VERIFY === 'PASSED' || pipelineState.FACE_VERIFY === 'FAILED')
        );
      case 'FINAL_DECISION':
        return (
          pipelineState.FINAL_DECISION === 'COMPLETED' ||
          pipelineState.FINAL_DECISION === 'READY' ||
          pipelineState.RISK_ANALYSIS === 'COMPLETED' ||
          pipelineState.RISK_ANALYSIS === 'PASSED'
        );
      default:
        return false;
    }
  };

  const handleStageSelect = (stage: ScreeningStage) => {
    if (activeStageRef.current === 'FINAL_DECISION') {
      console.log(`[PIPELINE] Retaining Final Report Dossier. Stage selection ${stage} ignored while on Step 5.`);
      return;
    }
    if (canAccessStage(stage)) {
      setStageSafely(stage, 'Stepper Click');
    }
  };

  // Stage 1: Document Verification Complete
  const handleDocAnalysisComplete = async (newDocResult: DocumentAnalysisResult) => {
    setDocResult(newDocResult);
    setFaceResult(undefined);
    setLivenessPassed(false);

    const qGate = newDocResult.qualityGate;
    const isRecapture = newDocResult.recaptureRequired || qGate?.status === 'RECAPTURE_REQUIRED' || newDocResult.finalDecision === 'RECAPTURE REQUIRED';
    const isPass = newDocResult.status === 'LOW' && !isRecapture && (newDocResult.finalDecision === 'VERIFIED' || !newDocResult.finalDecision);

    setPipelineState({
      DOC_ANALYSIS: isRecapture ? 'RECAPTURE_REQUIRED' : (isPass ? 'PASSED' : 'FAILED'),
      LIVENESS_CHECK: isRecapture ? 'LOCKED' : 'READY',
      FACE_VERIFY: 'LOCKED',
      RISK_ANALYSIS: 'LOCKED',
      FINAL_DECISION: 'LOCKED',
    });

    try {
      const updatedRisk = await ScreeningApiService.calculateCompositeRisk(newDocResult);
      if (activeStageRef.current !== 'FINAL_DECISION') {
        setRiskDecision(updatedRisk);
      }
    } catch (e) {}
  };

  // Stage 2: Liveness Challenge Complete
  const handleLivenessComplete = async (success: boolean) => {
    setLivenessPassed(success);

    setPipelineState((prev) => ({
      ...prev,
      LIVENESS_CHECK: success ? 'PASSED' : 'FAILED',
      FACE_VERIFY: 'READY',
      RISK_ANALYSIS: 'LOCKED',
      FINAL_DECISION: 'LOCKED',
    }));

    try {
      const updatedRisk = await ScreeningApiService.calculateCompositeRisk(
        docResult,
        faceResult,
        { passed: success, score: success ? 100 : 0 }
      );
      if (activeStageRef.current !== 'FINAL_DECISION') {
        setRiskDecision(updatedRisk);
      }
    } catch (e) {}

    // Only transition if not already in final report stage
    if (activeStageRef.current !== 'FINAL_DECISION') {
      setStageSafely('FACE_VERIFY', 'Liveness Completed');
    }
  };

  // Stage 3: Face Verification Complete
  const handleFaceVerificationComplete = async (result: FaceVerificationResult) => {
    setFaceResult(result);
    const isMatch = result.similarityScore >= 70.0 && result.status !== 'FAILED';

    setPipelineState((prev) => ({
      ...prev,
      FACE_VERIFY: isMatch ? 'PASSED' : 'FAILED',
      RISK_ANALYSIS: 'READY',
      FINAL_DECISION: 'LOCKED',
    }));

    try {
      const updatedRisk = await ScreeningApiService.calculateCompositeRisk(
        docResult,
        result,
        { passed: livenessPassed, score: livenessPassed ? 100 : 0 }
      );
      if (activeStageRef.current !== 'FINAL_DECISION') {
        setRiskDecision(updatedRisk);
      }
    } catch (e) {}

    // Only transition if not already in final report stage
    if (activeStageRef.current !== 'FINAL_DECISION') {
      setStageSafely('RISK_ANALYSIS', 'Face Verification Completed');
    }
  };

  // Final Verdict Derivation
  const getOverallVerdict = (): VerdictInfo => {
    const docPass = pipelineState.DOC_ANALYSIS === 'PASSED';
    const livePass = pipelineState.LIVENESS_CHECK === 'PASSED';
    const facePass = pipelineState.FACE_VERIFY === 'PASSED';
    const docRecapture = pipelineState.DOC_ANALYSIS === 'RECAPTURE_REQUIRED';
    const docFailed = pipelineState.DOC_ANALYSIS === 'FAILED';

    if (docRecapture) {
      return {
        decision: 'RECAPTURE REQUIRED',
        color: isDark ? 'text-amber-400' : 'text-amber-600',
        badgeColor: isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
        summary: 'Document image quality is insufficient for conclusive forensic analysis. Please upload a clear photo or official digital PDF.',
        recommendedAction: 'RECAPTURE_DOCUMENT',
        reasons: ['Optical quality gate failed (Blur / Low resolution).'],
      };
    }

    if (docFailed) {
      return {
        decision: 'HIGH RISK',
        color: isDark ? 'text-rose-400' : 'text-rose-600',
        badgeColor: isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200',
        summary: 'Document verification failed: Mathematical checksum mismatch, layout contradiction, or localized tampering indicators detected.',
        recommendedAction: 'REJECT_AND_REPORT',
        reasons: docResult.suspiciousReasons && docResult.suspiciousReasons.length > 0
          ? docResult.suspiciousReasons
          : ['Document failed security validation.'],
      };
    }

    if (pipelineState.FACE_VERIFY === 'FAILED') {
      return {
        decision: 'HIGH RISK',
        color: isDark ? 'text-rose-400' : 'text-rose-600',
        badgeColor: isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200',
        summary: 'Biometric face match failed. Live selfie does not match the portrait on the identity document.',
        recommendedAction: 'REJECT_AND_REPORT',
        reasons: ['Biometric facial mismatch below threshold.'],
      };
    }

    if (pipelineState.LIVENESS_CHECK === 'FAILED') {
      return {
        decision: 'SUSPICIOUS',
        color: isDark ? 'text-amber-400' : 'text-amber-600',
        badgeColor: isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
        summary: 'Active liveness challenge failed or timed out. Presentation attack or spoofing detected.',
        recommendedAction: 'MANUAL_REVIEW',
        reasons: ['Liveness temporal challenge not completed.'],
      };
    }

    if (docPass && livePass && facePass) {
      return {
        decision: 'VERIFIED',
        color: isDark ? 'text-emerald-400' : 'text-emerald-600',
        badgeColor: isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        summary: 'Identity successfully verified. Sovereign checksums validated, real-time 3D liveness confirmed, and 1:1 facial biometric match verified.',
        recommendedAction: 'APPROVE',
        reasons: [
          'Document structure & mathematical checksums validated.',
          'Active 3D temporal liveness verified.',
          'Biometric face match confirmed above threshold.',
        ],
      };
    }

    return {
      decision: 'SUSPICIOUS',
      color: isDark ? 'text-amber-400' : 'text-amber-600',
      badgeColor: isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
      summary: 'Screening pipeline is incomplete. Please complete all sequential verification steps.',
      recommendedAction: 'CONTINUE_VERIFICATION',
      reasons: ['Awaiting stage completion.'],
    };
  };

  // Stage 4 -> Stage 5: Proceed to Final Decision & Record Session History (PERMANENT RETENTION)
  const handleProceedToFinalDecision = () => {
    // 1. Immediately and synchronously lock in Stage 5
    console.log('[PIPELINE] Locking in Step 5: Final Decision Verdict & Comprehensive Dossier.');
    activeStageRef.current = 'FINAL_DECISION';
    setActiveStage('FINAL_DECISION');
    
    // 2. Mark stages as completed
    setPipelineState((prev) => ({
      ...prev,
      RISK_ANALYSIS: 'COMPLETED',
      FINAL_DECISION: 'COMPLETED',
    }));

    const verdict = getOverallVerdict();

    // 3. Persist verification session to backend history asynchronously in background (fire-and-forget)
    ScreeningApiService.recordVerificationSession({
      case_id: riskDecision.caseId || `VERIF-${Date.now().toString().slice(-6)}`,
      applicant_name: docResult.ocr?.fields?.name || 'Applicant Subject',
      doc_data: docResult,
      final_decision: verdict.decision,
      overall_risk_score: riskDecision.overallRiskScore,
      overall_status: riskDecision.overallStatus,
      liveness_passed: livenessPassed,
      face_similarity: faceResult?.similarityScore || 0,
    }).catch((err) => {
      console.warn('Session history record note:', err);
    });
  };

  // Clean session reset (ONLY triggered when user explicitly clicks "New Verification" and confirms)
  const resetEntireSession = () => {
    console.log('[PIPELINE] Operator confirmed New Verification. Resetting all pipeline stages to Step 1.');
    activeStageRef.current = 'DOC_ANALYSIS';
    setDocResult(EMPTY_DOC_RESULT);
    setFaceResult(undefined);
    setLivenessPassed(false);
    setRiskDecision(EMPTY_RISK_DECISION);
    setPipelineState({
      DOC_ANALYSIS: 'READY',
      LIVENESS_CHECK: 'LOCKED',
      FACE_VERIFY: 'LOCKED',
      RISK_ANALYSIS: 'LOCKED',
      FINAL_DECISION: 'LOCKED',
    });
    setActiveStage('DOC_ANALYSIS');
    setShowResetModal(false);
  };

  const finalVerdict = getOverallVerdict();
  const ocrFields = docResult.ocr?.fields;
  const isFlaggedDocument = finalVerdict.decision === 'HIGH RISK' || finalVerdict.decision === 'SUSPICIOUS';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 5-Step Stepper Navigation */}
      <Stepper
        currentStage={activeStage}
        pipelineState={pipelineState}
        onSelectStage={handleStageSelect}
        canAccessStage={canAccessStage}
      />

      {/* STAGE 1: DOCUMENT FORENSICS */}
      {activeStage === 'DOC_ANALYSIS' && (
        <DocumentForensics
          analysisResult={docResult}
          onAnalysisComplete={handleDocAnalysisComplete}
          onProceedToNext={() => {
            if (canAccessStage('LIVENESS_CHECK')) {
              setStageSafely('LIVENESS_CHECK', 'Document Step Completed');
            }
          }}
        />
      )}

      {/* STAGE 2: ACTIVE 3D LIVENESS CHALLENGE */}
      {activeStage === 'LIVENESS_CHECK' && (
        <div className="space-y-6">
          <LivenessChallenge
            onComplete={handleLivenessComplete}
            onRetry={() => {
              setLivenessPassed(false);
            }}
          />
        </div>
      )}

      {/* STAGE 3: BIOMETRIC FACE MATCH */}
      {activeStage === 'FACE_VERIFY' && (
        <FaceVerification
          docResult={docResult}
          currentFaceResult={faceResult}
          onVerificationComplete={handleFaceVerificationComplete}
          onProceedToLiveness={() => {
            setStageSafely('RISK_ANALYSIS', 'Face Verification Next Step');
          }}
        />
      )}

      {/* STAGE 4: COMPOSITE RISK DASHBOARD */}
      {activeStage === 'RISK_ANALYSIS' && (
        <div className="space-y-6">
          <RiskDashboard
            riskDecision={riskDecision}
            docAnalysis={docResult}
            faceVerification={faceResult}
            onProceedToFinalDecision={handleProceedToFinalDecision}
            onGenerateReport={() => setIsReportModalOpen(true)}
          />
        </div>
      )}

      {/* STAGE 5: COMPREHENSIVE FINAL REPORT (PERMANENTLY RETAINED ON SCREEN UNTIL USER EXPLICITLY CLICKS NEW VERIFICATION) */}
      {activeStage === 'FINAL_DECISION' && (
        <div className="space-y-6">
          {/* Verdict Banner */}
          <div
            className={`p-6 md:p-8 rounded-2xl border shadow-sm backdrop-blur-xl transition-colors ${
              finalVerdict.decision === 'VERIFIED'
                ? isDark ? 'border-emerald-500/30 bg-emerald-950/15' : 'border-emerald-200 bg-emerald-50/60'
                : finalVerdict.decision === 'SUSPICIOUS'
                ? isDark ? 'border-amber-500/30 bg-amber-950/15' : 'border-amber-200 bg-amber-50/60'
                : finalVerdict.decision === 'RECAPTURE REQUIRED'
                ? isDark ? 'border-blue-500/30 bg-blue-950/15' : 'border-blue-200 bg-blue-50/60'
                : isDark ? 'border-rose-500/30 bg-rose-950/15' : 'border-rose-200 bg-rose-50/60'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Award
                    className={`w-5 h-5 ${
                      finalVerdict.decision === 'VERIFIED'
                        ? 'text-emerald-500'
                        : finalVerdict.decision === 'SUSPICIOUS'
                        ? 'text-amber-500'
                        : finalVerdict.decision === 'RECAPTURE REQUIRED'
                        ? 'text-blue-500'
                        : 'text-rose-500'
                    }`}
                  />
                  <span className={`text-xs font-mono font-semibold tracking-widest uppercase ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    FINAL VERIFICATION REPORT
                  </span>
                </div>

                <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${finalVerdict.color}`}>
                  {finalVerdict.decision}
                </h1>
                <p className={`text-xs md:text-sm max-w-xl ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {finalVerdict.summary}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {isFlaggedDocument && (
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>REPORT TO CYBERCRIME</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className={`px-4 py-2.5 rounded-lg font-semibold text-xs border flex items-center gap-2 cursor-pointer shadow-sm transition-all ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  <FileDown className="w-4 h-4 text-blue-500" />
                  <span>Download Incident Dossier</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className={`px-4 py-2.5 rounded-lg font-semibold text-xs border flex items-center gap-2 cursor-pointer transition-all ${
                    isDark ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>NEW VERIFICATION</span>
                </button>
              </div>
            </div>
          </div>

          {/* DEDICATED SECTION: WHY THIS DOCUMENT WAS FLAGGED */}
          {isFlaggedDocument && docResult.suspiciousReasons && docResult.suspiciousReasons.length > 0 && (
            <div className={`p-6 rounded-2xl border shadow-sm space-y-3 ${
              isDark ? 'border-rose-500/40 bg-rose-950/20' : 'border-rose-300 bg-rose-50'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className={`text-sm font-bold uppercase tracking-wide ${isDark ? 'text-rose-200' : 'text-rose-900'}`}>
                  WHY THIS DOCUMENT WAS FLAGGED
                </h3>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                The multi-signal forensic verification engine identified the following specific contradictions or failure evidence:
              </p>
              <ul className={`space-y-2 text-xs pt-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {docResult.suspiciousReasons.map((reason, idx) => (
                  <li key={idx} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-950/70 border-rose-500/20' : 'bg-white border-rose-200'
                  }`}>
                    <span className="text-rose-500 font-bold mt-0.5">✕</span>
                    <span className="leading-relaxed">{reason}</span>
                  </li>
                ))}
              </ul>

              {/* Direct Link to Official Cybercrime Portal */}
              <div className={`pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t text-xs ${
                isDark ? 'border-rose-500/20' : 'border-rose-200'
              }`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                  File formal identity fraud report on the National Cyber Crime Reporting Portal:
                </span>
                <a
                  href="https://www.cybercrime.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs border inline-flex items-center gap-1.5 self-start sm:self-auto ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
                  }`}
                >
                  <span>cybercrime.gov.in (Helpline: 1930)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                </a>
              </div>
            </div>
          )}

          {/* Verification Audit Dossier Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Card: Verified Identity Credentials */}
            <div className={`p-6 rounded-xl border shadow-sm space-y-4 ${
              isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white shadow-slate-100'
            }`}>
              <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-500" />
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Extracted Document Credentials
                  </h3>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  {docResult.documentType}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Applicant Name</span>
                  <span className={`font-semibold mt-0.5 block ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{ocrFields?.name || 'XYZ'}</span>
                </div>
                <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Document Number</span>
                  <span className={`font-mono font-semibold mt-0.5 block ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{ocrFields?.docNumber || 'XXXXX'}</span>
                </div>
                <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Date of Birth</span>
                  <span className={`font-mono mt-0.5 block ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{ocrFields?.dob || '--/--/----'}</span>
                </div>
                <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gender</span>
                  <span className={`mt-0.5 block ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{ocrFields?.gender || '--'}</span>
                </div>
                <div className={`p-3 rounded-lg border sm:col-span-2 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Address</span>
                  <span className={`mt-0.5 block truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{ocrFields?.address || 'Not Available'}</span>
                </div>
              </div>

              {/* SHA-256 Digest Bar */}
              {docResult.evidenceSha256 && (
                <div className={`p-3 rounded-lg border space-y-1 ${
                  isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] font-mono block uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    SHA-256 Cryptographic Evidence Digest
                  </span>
                  <div className={`text-[11px] font-mono break-all ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {docResult.evidenceSha256}
                  </div>
                </div>
              )}
            </div>

            {/* Right Card: Stage-by-Stage Verification Signals */}
            <div className={`p-6 rounded-xl border shadow-sm space-y-4 ${
              isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white shadow-slate-100'
            }`}>
              <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-emerald-500" />
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Stage-by-Stage Verification Signals
                  </h3>
                </div>
                <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  5 of 5 Stages Evaluated
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Stage 1 Check */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>1. Document Verification</span>
                  </div>
                  <span className={`font-mono font-semibold ${
                    pipelineState.DOC_ANALYSIS === 'PASSED' 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {pipelineState.DOC_ANALYSIS}
                  </span>
                </div>

                {/* Stage 2 Check */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Smile className="w-4 h-4 text-emerald-500" />
                    <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>2. Active 3D Liveness</span>
                  </div>
                  <span className={`font-mono font-semibold ${
                    livenessPassed 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : pipelineState.LIVENESS_CHECK === 'FAILED'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-500'
                  }`}>
                    {livenessPassed ? 'PASSED (100%)' : pipelineState.LIVENESS_CHECK === 'FAILED' ? 'FAILED / TIMEOUT' : 'NOT COMPLETED'}
                  </span>
                </div>

                {/* Stage 3 Check */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-500" />
                    <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>3. Biometric Face Match</span>
                  </div>
                  <span className={`font-mono font-semibold ${
                    faceResult?.status === 'PASSED'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : faceResult?.similarityScore
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-500'
                  }`}>
                    {faceResult?.status === 'PASSED' 
                      ? `${faceResult.similarityScore?.toFixed(1) || 92}% Match (PASS)` 
                      : faceResult?.similarityScore 
                      ? `${faceResult.similarityScore?.toFixed(1)}% Match (FAIL)` 
                      : 'NOT COMPLETED'}
                  </span>
                </div>

                {/* Stage 4 Check */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>4. Risk Engine</span>
                  </div>
                  <span className={`font-mono font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Risk: {riskDecision.overallRiskScore.toFixed(1)} / 100 ({riskDecision.overallStatus})
                  </span>
                </div>

                {/* Stage 5 Summary */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-500" />
                    <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>5. Final Verdict</span>
                  </div>
                  <span className={`font-mono font-bold ${finalVerdict.color}`}>
                    {finalVerdict.decision}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cybercrime Modal */}
      {isReportModalOpen && (
        <CybercrimeReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          analysisResult={docResult}
          faceResult={faceResult}
          riskDecision={riskDecision}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Start New Verification Session?</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              This will clear all current session data, biometric features, and document analysis results.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetEntireSession}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const UnifiedWorkflowPage: React.FC<UnifiedWorkflowProps> = (props) => {
  return <UnifiedWorkflow {...props} />;
};
