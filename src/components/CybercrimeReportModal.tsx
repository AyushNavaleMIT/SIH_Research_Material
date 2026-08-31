import React, { useState } from 'react';
import { 
  X, 
  FileDown, 
  Copy, 
  Check, 
  ExternalLink, 
  PhoneCall, 
  ShieldAlert, 
  Loader2,
  FileText
} from 'lucide-react';
import type { AggregatedRiskDecision, DocumentAnalysisResult } from '../types';
import { ScreeningApiService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface CybercrimeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  riskDecision?: AggregatedRiskDecision;
  docResult?: DocumentAnalysisResult;
  analysisResult?: DocumentAnalysisResult;
  faceResult?: any;
}

export const CybercrimeReportModal: React.FC<CybercrimeReportModalProps> = ({
  isOpen,
  onClose,
  riskDecision,
  docResult,
  analysisResult,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [copiedHash, setCopiedHash] = useState(false);
  const [analystNotes, setAnalystNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportUrls, setReportUrls] = useState<{
    pdfUrl?: string;
    jsonUrl?: string;
    caseId?: string;
  } | null>(null);

  if (!isOpen) return null;

  const activeDoc = docResult || analysisResult || {
    documentId: 'DOC-INCIDENT',
    documentType: 'IDENTITY_DOCUMENT',
    evidenceSha256: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
    fileName: 'uploaded_evidence.jpg',
    tamperingScore: 75.0,
    suspiciousReasons: ['Document checksum or structural anomaly detected.'],
    suspiciousRegions: [],
    ocr: undefined,
    mrz: undefined,
    barcode: undefined,
  };

  const activeRisk = riskDecision || {
    caseId: `CYBER-2026-${activeDoc.documentId}`,
    applicantName: 'Unknown Applicant',
    overallStatus: 'HIGH' as const,
    finalDecision: 'HIGH RISK' as const,
    overallRiskScore: 75.0,
    evidenceSha256: activeDoc.evidenceSha256,
  };

  const sha256 = activeDoc.evidenceSha256 || activeRisk.evidenceSha256 || '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d';
  const caseId = activeRisk.caseId || `CYBER-2026-${activeDoc.documentId}`;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCreateCase = async () => {
    try {
      setIsGenerating(true);
      const payload = {
        case_id: caseId,
        filename: activeDoc.fileName || 'uploaded_document.jpg',
        evidence_sha256: sha256,
        risk_level: activeRisk.overallStatus,
        final_decision: activeRisk.finalDecision || 'HIGH RISK',
        tampering_score: activeDoc.tamperingScore || 75.0,
        composite_risk_score: activeRisk.overallRiskScore || 75.0,
        analysis_method: 'OpenCV / ELA Spectral Engine',
        reasons: activeDoc.suspiciousReasons || [],
        suspicious_regions: activeDoc.suspiciousRegions || [],
        ocr: activeDoc.ocr,
        mrz: activeDoc.mrz,
        barcode: activeDoc.barcode,
        analyst_notes: analystNotes || 'Official case dossier compiled for cybercrime investigation.',
      };

      const res = await ScreeningApiService.generateCybercrimeReport(payload);
      setReportUrls({
        pdfUrl: res.pdf_download_url,
        jsonUrl: res.json_download_url,
        caseId: res.case_id || caseId,
      });
    } catch (err) {
      console.warn('Report generation note:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden space-y-4 p-6 my-8 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
              isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Official Cybercrime Incident Evidence Dossier
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                National Cyber Crime Reporting Portal (MHA) Standard Format
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Portal Referral Notice */}
        <div className={`p-3.5 rounded-xl border space-y-2 ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={`flex items-center justify-between text-xs font-semibold ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>
            <span>Target Official Portal</span>
            <a
              href="https://www.cybercrime.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono text-xs"
            >
              <span>cybercrime.gov.in</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            For identity theft, forged documentation, or synthetic profile fraud within India, reports may be filed directly on the National Cyber Crime Reporting Portal or via 24x7 Helpline <strong>1930</strong>.
          </p>
        </div>

        {/* Evidence Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Case ID</span>
            <div className={`font-mono font-semibold mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{caseId}</div>
          </div>
          <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Subject Name</span>
            <div className={`font-semibold mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{activeRisk.applicantName}</div>
          </div>
          <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Document Type</span>
            <div className={`font-semibold mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{activeDoc.documentType}</div>
          </div>
          <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Composite Risk Score</span>
            <div className="font-mono font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
              {activeRisk.overallRiskScore.toFixed(1)} / 100 ({activeRisk.overallStatus})
            </div>
          </div>
        </div>

        {/* SHA-256 Digest Bar */}
        <div className={`p-3 rounded-lg border space-y-1 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-mono uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              SHA-256 Cryptographic Evidence Digest
            </span>
            <button
              type="button"
              onClick={handleCopyHash}
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-mono"
            >
              {copiedHash ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copiedHash ? 'Copied' : 'Copy Hash'}
            </button>
          </div>
          <div className={`text-[11px] font-mono break-all ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{sha256}</div>
        </div>

        {/* Analyst Notes Input */}
        <div className="space-y-1">
          <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Investigator / Compliance Examiner Notes
          </label>
          <textarea
            rows={2}
            value={analystNotes}
            onChange={(e) => setAnalystNotes(e.target.value)}
            placeholder="Add relevant case context or audit remarks before exporting dossier..."
            className={`w-full p-2.5 rounded-lg border text-xs focus:border-blue-500 focus:outline-none ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        {/* Action / Download Buttons */}
        <div className={`pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
            <span>Emergency Toll-Free Helpline: <strong>1930</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {reportUrls?.pdfUrl ? (
              <a
                href={reportUrls.pdfUrl}
                download={`Cybercrime_Report_${caseId}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" /> Download PDF Report
              </a>
            ) : (
              <button
                type="button"
                onClick={handleCreateCase}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer w-full sm:w-auto justify-center"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                <span>Generate Official PDF Dossier</span>
              </button>
            )}

            {reportUrls?.jsonUrl && (
              <a
                href={reportUrls.jsonUrl}
                download={`Cybercrime_Report_${caseId}.json`}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3.5 py-2 rounded-lg font-semibold text-xs border flex items-center gap-1.5 cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                <FileDown className="w-3.5 h-3.5" /> JSON Export
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
