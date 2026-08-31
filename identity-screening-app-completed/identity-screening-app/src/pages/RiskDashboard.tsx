import React, { useState } from 'react';
import type { SampleCase, ActionRecommendation } from '../types';
import { RiskCard } from '../components/RiskCard';
import { ReasonCard } from '../components/ReasonCard';
import { CybercrimeReportModal } from '../components/CybercrimeReportModal';
import {
  Download,
  CheckCircle2,
  ShieldAlert,
  Lock,
  ExternalLink,
  PhoneCall,
  Fingerprint
} from 'lucide-react';

interface RiskDashboardProps {
  currentCase: SampleCase;
}

export const RiskDashboardPage: React.FC<RiskDashboardProps> = ({ currentCase }) => {
  const [decisionState, setDecisionState] = useState(currentCase.riskDecision);
  const [exportNotice] = useState<string | null>(null);
  const [isCyberModalOpen, setIsCyberModalOpen] = useState(false);

  const handleManualOverride = (action: ActionRecommendation) => {
    setDecisionState((prev) => ({
      ...prev,
      analystOverride: {
        action,
        analystName: 'Analyst ID-409',
        timestamp: new Date().toISOString(),
        notes: `Analyst manually updated recommended action to ${action}`,
      },
    }));
  };

  const handleExportReport = async () => {
    setIsCyberModalOpen(true);
  };

  const isHighRisk = decisionState.overallStatus === 'HIGH';
  const isSuspicious = decisionState.overallStatus === 'MEDIUM';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Page Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
            <span>MODULE 8</span>
            <span>&bull;</span>
            <span className="uppercase">EXPLAINABLE RISK & DECISION ENGINE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Explainable Risk & Decision Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Multi-modal risk calculation factoring in ELA Tampering, OCR Clarity, MRZ Checksums, and QR Cross-Matching.
          </p>

          {/* Evidence SHA-256 Hash badge */}
          {decisionState.evidenceSha256 && (
            <div className="flex items-center space-x-2 mt-2 text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 self-start inline-flex">
              <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
              <span>Evidence SHA-256: <span className="text-slate-300">{decisionState.evidenceSha256.slice(0, 24)}...</span></span>
            </div>
          )}
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-2.5">
          {(isHighRisk || isSuspicious) && (
            <button
              onClick={() => setIsCyberModalOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs rounded-lg shadow-lg shadow-rose-950 transition-all cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Create Cybercrime Case</span>
            </button>
          )}

          <button
            onClick={handleExportReport}
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Forensic Case Report</span>
          </button>
        </div>
      </div>

      {/* Official Cyber Crime Portal Reference Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold">
            <Lock className="w-4 h-4" />
            <span>Official Cybercrime Escalation Link: Indian National Cyber Crime Reporting Portal</span>
          </div>
          <p className="text-slate-400 text-[11px] font-sans">
            Central portal (Ministry of Home Affairs) for filing identity fraud and forged credential cases.
          </p>
        </div>
        <div className="flex items-center space-x-4 shrink-0">
          <div className="flex items-center gap-1.5 text-rose-400 font-bold">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Helpline: 1930</span>
          </div>
          <a
            href="https://www.cybercrime.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 rounded-lg text-xs transition-colors cursor-pointer"
          >
            <span>Visit cybercrime.gov.in</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Export notification popup */}
      {exportNotice && (
        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-300 px-4 py-2.5 rounded-lg text-xs font-mono flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {exportNotice}
          </span>
          <span className="text-[10px] text-emerald-500">DIGITAL SIGNATURE ATTACHED</span>
        </div>
      )}

      {/* TOP & MIDDLE SECTIONS: Risk Score, Action Banner & 5-Dimension Progress Bars */}
      <RiskCard decision={decisionState} onManualOverride={handleManualOverride} />

      {/* BOTTOM SECTION: "Why was this decision made?" Explainable Reason Cards */}
      <ReasonCard reasons={decisionState.reasons} />

      {/* Cybercrime Case Modal */}
      <CybercrimeReportModal
        isOpen={isCyberModalOpen}
        onClose={() => setIsCyberModalOpen(false)}
        analysisResult={currentCase.docAnalysis}
        riskDecision={decisionState}
      />
    </div>
  );
};
