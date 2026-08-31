import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Camera, 
  ShieldAlert, 
  Loader2,
  Lock,
  FileCheck2
} from 'lucide-react';
import type { DocumentAnalysisResult, SampleCase } from '../types';
import { FileUpload } from '../components/FileUpload';
import { HeatmapViewer } from '../components/HeatmapViewer';
import { ScreeningApiService } from '../services/api';
import { CybercrimeReportModal } from '../components/CybercrimeReportModal';
import { useTheme } from '../context/ThemeContext';

interface DocumentForensicsProps {
  currentCase?: SampleCase;
  analysisResult?: DocumentAnalysisResult;
  onAnalysisComplete?: (result: DocumentAnalysisResult) => void;
  onProceedToNext?: () => void;
  onSelectSample?: (caseId: string) => void;
}

const SCAN_STAGES = [
  { label: 'DOCUMENT RECEIVED', desc: 'Securely parsing uploaded container' },
  { label: 'SCANNING BOUNDARIES', desc: 'Detecting document geometry & resolution' },
  { label: 'OCR ANALYSIS', desc: 'Extracting text, numbers & demographic fields' },
  { label: 'STRUCTURAL VALIDATION', desc: 'Verifying UIDAI / Income Tax / ICAO checksums' },
  { label: 'AUTHENTICITY FORENSICS', desc: 'Synthesizing multi-signal tampering indicators' },
];

export const DocumentForensics: React.FC<DocumentForensicsProps> = ({
  currentCase,
  analysisResult,
  onAnalysisComplete,
  onProceedToNext,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [currentResult, setCurrentResult] = useState<DocumentAnalysisResult>(
    analysisResult || currentCase?.docAnalysis || ({} as DocumentAnalysisResult)
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    if (analysisResult) {
      setCurrentResult(analysisResult);
    } else if (currentCase?.docAnalysis) {
      setCurrentResult(currentCase.docAnalysis);
    }
  }, [analysisResult, currentCase]);

  // Progressive scan step indicator during real backend upload
  useEffect(() => {
    let interval: any = null;
    if (isAnalyzing) {
      setScanStepIndex(0);
      interval = setInterval(() => {
        setScanStepIndex((prev) => {
          if (prev < SCAN_STAGES.length - 1) return prev + 1;
          return prev;
        });
      }, 700);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing]);

  const handleFileUpload = async (file: File) => {
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const apiResult = await ScreeningApiService.analyzeDocument(file);
      setCurrentResult(apiResult);
      if (onAnalysisComplete) {
        onAnalysisComplete(apiResult);
      }
    } catch (err: any) {
      console.error('Document analysis failed:', err);
      setErrorMessage(
        err.message || 'Failed to analyze document. Please check the backend connection and try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isUploaded = currentResult.documentType && currentResult.documentType !== 'NOT_UPLOADED' && currentResult.fileName !== 'No file uploaded';
  const qGate = currentResult.qualityGate;
  const isRecapture = currentResult.recaptureRequired || qGate?.status === 'RECAPTURE_REQUIRED' || currentResult.finalDecision === 'RECAPTURE REQUIRED';
  const isFailed = currentResult.status === 'HIGH' || currentResult.finalDecision === 'HIGH RISK';
  const isVerified = currentResult.status === 'LOW' && !isRecapture && !isFailed;

  return (
    <div className="space-y-6">
      {/* 1. START / UPLOAD HERO SECTION */}
      <div className={`p-6 md:p-8 rounded-2xl border shadow-sm backdrop-blur-xl space-y-5 transition-colors ${
        isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white shadow-slate-100'
      }`}>
        <div className="max-w-2xl mx-auto text-center space-y-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border ${
            isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Forensic Document Verification Engine</span>
          </div>
          <h2 className={`text-xl md:text-2xl font-bold tracking-tight ${
            isDark ? 'text-slate-100' : 'text-slate-900'
          }`}>
            Verify Identity Document
          </h2>
          <p className={`text-xs md:text-sm ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Upload an Indian Aadhaar, e-Aadhaar, PAN, Passport, or Driving License. Documents are verified with cryptographic checksums, layout consistency, and multi-signal forensic analysis.
          </p>
        </div>

        {/* Upload Dropzone */}
        <div className="max-w-2xl mx-auto">
          <FileUpload
            onFileSelect={handleFileUpload}
            isAnalyzing={isAnalyzing}
            selectedFileName={isUploaded ? currentResult.fileName : undefined}
          />
        </div>

        {/* Security & Compliance Banner */}
        <div className={`flex flex-wrap items-center justify-center gap-4 text-[11px] border-t pt-4 ${
          isDark ? 'text-slate-400 border-slate-800/80' : 'text-slate-500 border-slate-200'
        }`}>
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-blue-500" /> Cryptographic Integrity &amp; SHA-256 Digest
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <FileCheck2 className="w-3 h-3 text-emerald-500" /> Verhoeff Checksums &amp; QR Cross-Matching
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className={`w-3 h-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} /> Source-Aware Physical vs Digital Processing
          </span>
        </div>
      </div>

      {/* 2. PROGRESSIVE SCANNING ANIMATION */}
      {isAnalyzing && (
        <div className={`p-6 rounded-2xl border shadow-lg space-y-4 max-w-2xl mx-auto ${
          isDark ? 'border-blue-500/30 bg-slate-900/90' : 'border-blue-200 bg-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing Document...</span>
            </div>
            <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Stage {scanStepIndex + 1} of {SCAN_STAGES.length}
            </span>
          </div>

          {/* Stepper sequence */}
          <div className="space-y-2">
            {SCAN_STAGES.map((st, idx) => {
              const isDone = idx < scanStepIndex;
              const isCurrent = idx === scanStepIndex;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all ${
                    isDone
                      ? isDark ? 'bg-emerald-950/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : isCurrent
                      ? isDark ? 'bg-blue-950/30 border-blue-500/40 text-blue-200 ring-1 ring-blue-500/30' : 'bg-blue-50 border-blue-300 text-blue-900 ring-1 ring-blue-300'
                      : isDark ? 'bg-slate-950/40 border-slate-800/60 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 flex items-center justify-center font-bold">
                      {isDone ? '✓' : isCurrent ? '●' : '○'}
                    </div>
                    <span className="font-semibold tracking-wide">{st.label}</span>
                  </div>
                  <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{st.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 max-w-2xl mx-auto ${
          isDark ? 'bg-rose-950/30 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Verification Error</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* 3. DOCUMENT VERIFICATION RESULTS (Rendered after upload) */}
      {isUploaded && !isAnalyzing && (
        <div className="space-y-6">
          {/* HARD FAILURE ALERT BANNER WITH CONTINUE PIPELINE & CYBERCRIME REPORTING */}
          {isFailed && (
            <div className={`p-5 rounded-2xl border shadow-lg space-y-4 ${
              isDark ? 'bg-rose-950/30 border-rose-500/50' : 'bg-rose-50 border-rose-300'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                    isDark ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' : 'bg-rose-100 border-rose-200 text-rose-600'
                  }`}>
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold uppercase tracking-wide flex items-center gap-2 ${
                      isDark ? 'text-rose-200' : 'text-rose-900'
                    }`}>
                      <span>DOCUMENT HIGH RISK / SUSPICIOUS</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-200'
                      }`}>
                        FAILED CHECKSUM / TAMPERING
                      </span>
                    </h3>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      This document could not be verified and contains indicators of possible tampering or invalid credentials.
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>PREPARE CYBERCRIME REPORT</span>
                  </button>

                  {onProceedToNext && (
                    <button
                      type="button"
                      onClick={onProceedToNext}
                      className={`px-4 py-2 rounded-lg font-semibold text-xs border flex items-center gap-2 cursor-pointer transition-all ${
                        isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
                      }`}
                    >
                      <span>Continue Verification Pipeline</span>
                      <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Detected Reasons: Why this document was flagged */}
              {currentResult.suspiciousReasons && currentResult.suspiciousReasons.length > 0 && (
                <div className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${
                  isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-white border-rose-200 text-slate-800'
                }`}>
                  <div className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                    <span>Why this document was flagged:</span>
                  </div>
                  <ul className={`space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {currentResult.suspiciousReasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">✕</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* RECAPTURE REQUIRED BANNER */}
          {isRecapture && (
            <div className={`p-5 rounded-2xl border shadow-lg space-y-3 ${
              isDark ? 'bg-amber-950/25 border-amber-500/40' : 'bg-amber-50 border-amber-300'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                  isDark ? 'bg-amber-500/15 border-amber-400/30 text-amber-400' : 'bg-amber-100 border-amber-200 text-amber-700'
                }`}>
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wide ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>
                    DOCUMENT RECAPTURE REQUIRED
                  </h3>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {qGate?.recommendation || 'Image quality is insufficient. Please upload a clear photo or official digital document.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VERIFIED SUCCESS CALLOUT */}
          {isVerified && (
            <div className={`p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                  isDark ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400' : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                }`}>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${
                    isDark ? 'text-emerald-300' : 'text-emerald-800'
                  }`}>
                    <span>DOCUMENT AUTHENTICITY VERIFIED</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isDark ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/50' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      {currentResult.source_display || (currentResult.is_digital ? 'Digital Document' : 'Physical Document')}
                    </span>
                  </div>
                  <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Structure and checksums validated. Ready for Step 2: Active Liveness.
                  </div>
                </div>
              </div>

              {onProceedToNext && (
                <button
                  type="button"
                  onClick={onProceedToNext}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm cursor-pointer self-start sm:self-auto"
                >
                  <span>Proceed to Liveness</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Quality Gate Checkpoints Card */}
          {qGate && (
            <div className={`p-4 rounded-xl border shadow-sm space-y-3 ${
              isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white shadow-slate-100'
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Document Quality Gate Checkpoints
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ml-1 ${
                    isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    SOURCE: {currentResult.source_display || qGate.source_display || (currentResult.is_digital ? 'Digital Document' : 'Physical Capture')}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md border self-start sm:self-auto ${
                    qGate.passed
                      ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {qGate.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className={`p-2.5 rounded-lg border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Resolution</div>
                  <div className={`font-mono font-semibold mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{qGate.metrics.resolution}</div>
                </div>

                <div className={`p-2.5 rounded-lg border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {currentResult.is_digital || !qGate.metrics.blur_applicable ? 'Rendering Quality' : 'Blur / Sharpness'}
                  </div>
                  <div className={`font-mono font-semibold mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    {currentResult.is_digital || !qGate.metrics.blur_applicable ? (
                      <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Vector / Digital Crisp</span>
                    ) : (
                      <>{qGate.metrics.blur_score} <span className={`text-[10px] font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>(Min 45.0)</span></>
                    )}
                  </div>
                </div>

                <div className={`p-2.5 rounded-lg border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Mean Luminance</div>
                  <div className={`font-mono font-semibold mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{qGate.metrics.mean_luminance} / 255</div>
                </div>

                <div className={`p-2.5 rounded-lg border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Camera Flash Glare</div>
                  <div className={`font-mono font-semibold mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    {currentResult.is_digital || !qGate.metrics.glare_applicable ? (
                      <span className={`font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Not Applicable</span>
                    ) : (
                      `${qGate.metrics.glare_ratio_pct}%`
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Inspection Grid: Heatmap + Extracted Identity Credentials */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Heatmap */}
            <div className="space-y-4">
              <HeatmapViewer analysisResult={currentResult} />

              {/* Forensic Findings List */}
              {currentResult.suspiciousReasons && currentResult.suspiciousReasons.length > 0 && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white shadow-slate-100'
                }`}>
                  <h4 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    <FileText className="w-4 h-4 text-blue-500" />
                    Verification Signals &amp; Forensic Findings
                  </h4>
                  <ul className={`space-y-1.5 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {currentResult.suspiciousReasons.map((reason, idx) => (
                      <li key={idx} className={`flex items-start gap-2 p-2 rounded-lg border ${
                        isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right Column: Verified Extracted OCR Credentials */}
            <div className="space-y-4">
              <div className={`p-5 rounded-xl border shadow-sm space-y-4 ${
                isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white shadow-slate-100'
              }`}>
                <div className={`flex items-center justify-between pb-3 border-b ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <h3 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    <FileText className="w-4 h-4 text-blue-500" />
                    Extracted Document Credentials
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {currentResult.documentType}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {currentResult.detectedText.map((field, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{field.field}</span>
                      <span className={`font-mono font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {field.value || 'Not confidently detected'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Aadhaar / PAN Mathematical Status Tag */}
                {currentResult.aadhaarValidation?.is_aadhaar && (
                  <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>UIDAI Verhoeff 12-Digit Mathematical Checksum Validated (C=0).</span>
                  </div>
                )}
                {currentResult.panValidation?.is_pan && (
                  <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Income Tax PAN Alphanumeric Syntax Verified.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cybercrime Incident Reporting Modal */}
      {isReportModalOpen && (
        <CybercrimeReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          analysisResult={currentResult}
        />
      )}
    </div>
  );
};

export const DocumentForensicsPage: React.FC<DocumentForensicsProps> = (props) => {
  return <DocumentForensics {...props} />;
};
