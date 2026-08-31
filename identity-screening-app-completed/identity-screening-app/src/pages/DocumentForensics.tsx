import React, { useState, useEffect } from 'react';
import type { SampleCase, DocumentAnalysisResult } from '../types';
import { FileUpload } from '../components/FileUpload';
import { HeatmapViewer } from '../components/HeatmapViewer';
import { OcrResultCard } from '../components/OcrResultCard';
import { MrzValidationCard } from '../components/MrzValidationCard';
import { BarcodeVerificationCard } from '../components/BarcodeVerificationCard';
import { CybercrimeReportModal } from '../components/CybercrimeReportModal';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
  AlertCircle,
  ShieldAlert,
  Fingerprint
} from 'lucide-react';
import { ScreeningApiService } from '../services/api';

interface DocumentForensicsProps {
  currentCase: SampleCase;
  onSelectSample: (caseId: string) => void;
  onNextStage?: () => void;
}

export const DocumentForensicsPage: React.FC<DocumentForensicsProps> = ({
  currentCase,
  onSelectSample,
  onNextStage,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult>(
    currentCase.docAnalysis
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCyberModalOpen, setIsCyberModalOpen] = useState(false);

  // Sync state when sample preset selection changes
  useEffect(() => {
    setAnalysisResult(currentCase.docAnalysis);
    setErrorMessage(null);
  }, [currentCase]);

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const updated = await ScreeningApiService.analyzeDocument(currentCase.id);
      setAnalysisResult(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to analyze document.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const result = await ScreeningApiService.analyzeDocumentFile(file);
      setAnalysisResult(result);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Backend API error: Ensure FastAPI server is running on http://localhost:8000'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleErrorAlert = (msg: string) => {
    setErrorMessage(msg);
  };

  const isHighRisk = analysisResult.status === 'HIGH';
  const isSuspicious = analysisResult.status === 'MEDIUM';
  const finalDecision = analysisResult.finalDecision || (isHighRisk ? 'HIGH RISK' : isSuspicious ? 'SUSPICIOUS' : 'VERIFIED');
  const compScore = analysisResult.compositeRiskScore ?? analysisResult.tamperingScore;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Verdict & SHA-256 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
            <span>MODULE 6</span>
            <span>&bull;</span>
            <span className="uppercase">{analysisResult.documentType} MULTI-MODAL SCREENING</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            AI Document Forensics & Tamper Detection
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Spectral Error Level Analysis (ELA), Real RapidOCR, ICAO 9303 MRZ Checksums, and QR/Barcode Cross-Verification.
          </p>

          {/* Evidence SHA-256 Hash badge */}
          {analysisResult.evidenceSha256 && (
            <div className="flex items-center space-x-2 mt-2 text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 self-start inline-flex">
              <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
              <span>SHA-256: <span className="text-slate-300">{analysisResult.evidenceSha256.slice(0, 24)}...</span></span>
            </div>
          )}
        </div>

        {/* Quick Screening Verdict & Action Trigger */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div
            className={`bg-slate-950 p-3.5 rounded-xl border flex items-center space-x-3.5 ${
              isHighRisk
                ? 'border-rose-800 text-rose-300'
                : isSuspicious
                ? 'border-amber-800 text-amber-300'
                : 'border-emerald-800 text-emerald-300'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-mono font-bold text-base border shrink-0 ${
                isHighRisk
                  ? 'bg-rose-950 text-rose-400 border-rose-700'
                  : isSuspicious
                  ? 'bg-amber-950 text-amber-400 border-amber-700'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-700'
              }`}
            >
              {compScore.toFixed(1)}%
              <span className="text-[7.5px] uppercase tracking-tighter">RISK</span>
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Screening Verdict</div>
              <div className="text-sm font-bold font-mono">{finalDecision}</div>
              <div className="text-[11px] text-slate-500 font-mono">
                {analysisResult.suspiciousRegions.length} Anomaly Zones
              </div>
            </div>
          </div>

          {/* Cybercrime Case Creation Button for Suspicious/High Risk */}
          {(isHighRisk || isSuspicious) && (
            <button
              onClick={() => setIsCyberModalOpen(true)}
              className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs rounded-xl shadow-lg shadow-rose-950 transition-all cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Create Cybercrime Case</span>
            </button>
          )}
        </div>
      </div>

      {/* Error alert message banner */}
      {errorMessage && (
        <div className="bg-rose-950/90 border border-rose-600 text-rose-200 p-4 rounded-xl text-xs font-mono flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold block text-rose-300">Validation Error</span>
              <span>{errorMessage}</span>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-rose-100 rounded border border-rose-700 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload & Preset Component */}
      <FileUpload
        onFileUpload={handleFileUpload}
        onSelectSample={onSelectSample}
        selectedCase={currentCase}
        isAnalyzing={isAnalyzing}
        onStartAnalysis={handleStartAnalysis}
        onErrorAlert={handleErrorAlert}
      />

      {/* Heatmap & Suspicious Regions Viewer */}
      <HeatmapViewer analysisResult={analysisResult} />

      {/* 3 CORE REAL WORKING MODULE CARDS: OCR, MRZ, BARCODE */}
      <div className="grid grid-cols-1 gap-6">
        {/* 1. Real OCR Field Extraction Card */}
        <OcrResultCard ocr={analysisResult.ocr} />

        {/* 2. Real ICAO MRZ Checksum Validation Card */}
        <MrzValidationCard mrz={analysisResult.mrz} />

        {/* 3. Real QR & Barcode Cross-Verification Card */}
        <BarcodeVerificationCard barcode={analysisResult.barcode} />
      </div>

      {/* Analysis Methods & Reasons Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Forensic Inspection Methods */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Forensic Inspection Algorithms
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {analysisResult.analysisMethods.length} Active Engines
            </span>
          </div>

          <div className="space-y-3">
            {analysisResult.analysisMethods.map((method, idx) => (
              <div
                key={idx}
                className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 font-mono font-bold text-slate-200">
                    {method.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{method.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {method.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      method.passed
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border-rose-800'
                    }`}
                  >
                    {method.passed ? 'PASSED' : 'FLAGGED'}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-500 mt-1">
                    Conf: {method.confidence.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Suspicious Activity Reasons */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Reasons for Suspicious Activity & Decision Audit Trail
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Audit Trail</span>
          </div>

          {analysisResult.suspiciousReasons.length > 0 ? (
            <div className="space-y-2.5">
              {analysisResult.suspiciousReasons.map((reason, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-3 rounded-lg border border-rose-900/60 text-xs font-mono text-rose-300 flex items-start space-x-2.5"
                >
                  <span className="w-5 h-5 rounded bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed">{reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-950 p-6 rounded-lg border border-slate-800 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-bold text-slate-200">No Suspicious Activity Flags</p>
              <p className="text-[11px] text-slate-500 font-mono">
                Document matches expected security thread, OCR baseline, and ICAO checksum specifications.
              </p>
            </div>
          )}

          {/* Stepper Navigation trigger */}
          {onNextStage && (
            <div className="pt-2 text-right">
              <button
                onClick={onNextStage}
                className="px-4 py-2 bg-cyan-500 text-slate-950 font-mono font-bold text-xs rounded-lg hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                Proceed to Face Verification &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cybercrime Case Reporting Modal */}
      <CybercrimeReportModal
        isOpen={isCyberModalOpen}
        onClose={() => setIsCyberModalOpen(false)}
        analysisResult={analysisResult}
      />
    </div>
  );
};
