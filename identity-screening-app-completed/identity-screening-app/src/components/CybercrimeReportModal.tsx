import React, { useState } from 'react';
import {
  ShieldAlert,
  FileDown,
  ExternalLink,
  CheckCircle2,
  X,
  Lock,
  PhoneCall,
  Info,
  Copy,
  AlertTriangle,
  Send,
  Download
} from 'lucide-react';
import type { DocumentAnalysisResult, AggregatedRiskDecision } from '../types';
import { ScreeningApiService } from '../services/api';

interface CybercrimeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult?: DocumentAnalysisResult;
  riskDecision?: AggregatedRiskDecision;
}

export const CybercrimeReportModal: React.FC<CybercrimeReportModalProps> = ({
  isOpen,
  onClose,
  analysisResult,
  riskDecision,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [analystNotes, setAnalystNotes] = useState(
    'Document identified as High-Risk / Suspicious during automated identity screening. Splicing artifacts and cross-validation anomalies flagged for official review.'
  );
  const [generatedReport, setGeneratedReport] = useState<any | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const docType = analysisResult?.documentType || riskDecision?.documentType || 'IDENTITY_DOCUMENT';
  const riskScore = riskDecision?.overallRiskScore ?? analysisResult?.tamperingScore ?? 85.0;
  const decisionStatus = riskDecision?.finalDecision || analysisResult?.finalDecision || (riskScore > 65 ? 'HIGH RISK' : 'SUSPICIOUS');
  const sha256 = analysisResult?.evidenceSha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const caseId = riskDecision?.caseId || analysisResult?.documentId || `CYBER-2026-${Date.now().toString().slice(-6)}`;

  const handleCreateCase = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const payload = {
        case_id: caseId,
        filename: analysisResult?.fileName || 'document_evidence.jpg',
        evidence_sha256: sha256,
        risk_level: decisionStatus === 'HIGH RISK' ? 'HIGH' : 'MEDIUM',
        final_decision: decisionStatus,
        tampering_score: analysisResult?.tamperingScore || riskScore,
        composite_risk_score: riskScore,
        analysis_method: analysisResult?.analysisMethods?.[0]?.name || 'OpenCV ELA Forensics Engine',
        reasons: analysisResult?.suspiciousReasons || riskDecision?.reasons?.map((r) => r.description) || [],
        suspicious_regions: analysisResult?.suspiciousRegions || [],
        ocr: analysisResult?.ocr,
        mrz: analysisResult?.mrz,
        barcode: analysisResult?.barcode,
        analyst_notes: analystNotes,
      };

      const res = await ScreeningApiService.generateCybercrimeReport(payload);
      setGeneratedReport(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate cybercrime report dossier.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-700 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-950">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-900/80 text-rose-300 border border-rose-700 font-bold">
                  INCIDENT EVIDENCE DOSSIER
                </span>
                <span className="text-xs font-mono text-slate-400">ID: {caseId}</span>
              </div>
              <h3 className="text-base font-bold text-slate-100 mt-0.5">
                Create Cybercrime Incident & Evidence Report
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono">
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-950/90 border border-rose-600 text-rose-200 p-3 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Official Portal Reference Banner */}
          <div className="bg-cyan-950/40 border border-cyan-800/80 p-4 rounded-xl space-y-2 text-slate-300">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-cyan-400" />
                Indian National Cyber Crime Reporting Portal
              </span>
              <a
                href="https://www.cybercrime.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline font-bold"
              >
                <span>cybercrime.gov.in</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Official central repository under the Ministry of Home Affairs for reporting identity theft, forged documentation, and financial cybercrimes.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-[11px] pt-1">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>National Helpline: 1930 (24x7 Toll-Free)</span>
              </div>
              <div className="text-slate-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Status: Evidence Prepared for Investigator Submission</span>
              </div>
            </div>
          </div>

          {/* Case Evidence Summary Table */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-[11px] font-bold text-slate-300 uppercase">
              Forensic Screening Summary:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Document Type:</span>
                <span className="font-bold text-slate-200">{docType}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Screening Verdict:</span>
                <span className="font-bold text-rose-400">{decisionStatus}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Composite Risk:</span>
                <span className="font-bold text-rose-400">{riskScore.toFixed(1)} / 100</span>
              </div>
              <div>
                <span className="text-slate-500 block">OCR Extracted ID:</span>
                <span className="font-bold text-cyan-300">
                  {analysisResult?.ocr?.fields?.docNumber || 'N/A'}
                </span>
              </div>
            </div>

            {/* SHA-256 Hash Digest */}
            <div className="pt-2 border-t border-slate-900">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500 text-[10px] uppercase">
                  SHA-256 Evidence Cryptographic Digest (Chain of Custody):
                </span>
                <button
                  onClick={handleCopyHash}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedHash ? 'Copied!' : 'Copy Hash'}</span>
                </button>
              </div>
              <div className="bg-black/60 p-2 rounded border border-slate-850 font-mono text-[10px] text-emerald-400 break-all">
                {sha256}
              </div>
            </div>
          </div>

          {/* Investigator Notes Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">
              Investigator & Incident Audit Notes:
            </label>
            <textarea
              rows={3}
              value={analystNotes}
              onChange={(e) => setAnalystNotes(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-lg p-2.5 focus:border-cyan-500 focus:outline-none text-xs"
              placeholder="Add investigator observations, case rationale, or compliance notes..."
            />
          </div>

          {/* Compliance & Legal Disclaimer */}
          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed font-sans">
            <span className="font-bold text-slate-200 font-mono">HUMAN REVIEW NOTICE:</span> This system prepares formatted forensic evidence, cryptographic digests, and tamper heatmaps for human review and official submission. It does not automatically file a First Information Report (FIR) or submit to police APIs without authorized human investigator approval.
          </div>

          {/* Generated Report Download Area */}
          {generatedReport && (
            <div className="bg-emerald-950/70 border border-emerald-600 p-4 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Cybercrime Case Dossier Ready for Download</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={generatedReport.pdf_download_url}
                  download={`Cybercrime_Report_${caseId}.pdf`}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg shadow-lg transition-all cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download Official PDF Report</span>
                </a>
                <a
                  href={generatedReport.json_download_url}
                  download={`Cybercrime_Report_${caseId}.json`}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Download JSON Evidence Dossier</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition-colors cursor-pointer"
          >
            Close
          </button>

          {!generatedReport ? (
            <button
              onClick={handleCreateCase}
              disabled={isGenerating}
              className={`px-5 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                isGenerating
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950 active:scale-95'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{isGenerating ? 'Compiling Dossier...' : 'Generate Case Report Dossier'}</span>
            </button>
          ) : (
            <a
              href="https://www.cybercrime.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-mono font-bold flex items-center space-x-2 shadow-lg shadow-cyan-950 cursor-pointer"
            >
              <span>Visit National Cyber Crime Portal</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
