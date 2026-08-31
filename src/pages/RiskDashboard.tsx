import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  FileDown, 
  ExternalLink, 
  PhoneCall, 
  Info,
  ArrowRight
} from 'lucide-react';
import type { AggregatedRiskDecision, ActionRecommendation, SampleCase } from '../types';
import { RiskCard } from '../components/RiskCard';
import { CybercrimeReportModal } from '../components/CybercrimeReportModal';
import { useTheme } from '../context/ThemeContext';

interface RiskDashboardProps {
  riskDecision: AggregatedRiskDecision;
  onGenerateReport?: () => void;
  onProceedToFinalDecision?: () => void;
  onAnalystOverride?: (action: ActionRecommendation, notes: string) => void;
  docAnalysis?: any;
  faceVerification?: any;
  currentCase?: SampleCase;
}

export const RiskDashboard: React.FC<RiskDashboardProps> = ({
  riskDecision,
  onGenerateReport,
  onProceedToFinalDecision,
  onAnalystOverride,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const isHighRisk = riskDecision.overallStatus === 'HIGH' || riskDecision.overallRiskScore > 58.0;

  const handleManualOverride = (action: 'PASS' | 'MANUAL_REVIEW' | 'REJECT') => {
    if (onAnalystOverride) {
      onAnalystOverride(action as ActionRecommendation, 'Examiner override action');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`border rounded-xl p-5 shadow-sm backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-slate-100'
      }`}>
        <div>
          <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <ShieldAlert className="w-5 h-5 text-blue-500" />
            Step 4: Composite Multi-Modal Risk Engine
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Evidence synthesis integrating Document Forensics, Checksum Verifications, Facial Biometrics, and Active 3D Liveness.
          </p>
        </div>

        {isHighRisk && (
          <button
            type="button"
            onClick={onGenerateReport}
            className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer flex-shrink-0 transition-all"
          >
            <FileDown className="w-4 h-4" />
            <span>Generate Cybercrime Report</span>
          </button>
        )}
      </div>

      {/* Indian Cybercrime Portal Direct Escalation Banner if High Risk */}
      {isHighRisk && (
        <div className={`p-4 rounded-xl border-2 shadow-sm space-y-2.5 ${
          isDark ? 'bg-rose-950/40 border-rose-500/50' : 'bg-rose-50 border-rose-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wide ${
              isDark ? 'text-rose-300' : 'text-rose-800'
            }`}>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>High Risk / Synthetic Identity Alert (Cybercrime Portal Protocol)</span>
            </div>
            <a
              href="https://www.cybercrime.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono"
            >
              <span>cybercrime.gov.in</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Discrepancies indicate possible identity document manipulation, Verhoeff checksum violation, or presentation attack. A tamper-evident Cybercrime Dossier with SHA-256 evidence digests can be prepared for referral.
          </p>

          <div className={`flex items-center gap-3 pt-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <span className="flex items-center gap-1 text-rose-500 font-semibold">
              <PhoneCall className="w-3.5 h-3.5" /> National Helpline: 1930
            </span>
            <span>•</span>
            <span>Indian Cyber Crime Coordination Centre (I4C) Protocol Ready</span>
          </div>
        </div>
      )}

      {/* Main Risk Card (Score Meter & 5 Risk Dimensions) */}
      <RiskCard
        decision={riskDecision}
        onManualOverride={handleManualOverride}
      />

      {/* Explainable AI Reasons List */}
      {riskDecision.reasons && riskDecision.reasons.length > 0 && (
        <div className={`border rounded-xl p-5 shadow-sm space-y-3 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-slate-100'
        }`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>
            <Info className="w-4 h-4 text-blue-500" />
            Explainable AI Decision Factors ({riskDecision.reasons.length})
          </h3>

          <div className="space-y-2">
            {riskDecision.reasons.map((r) => (
              <div
                key={r.id}
                className={`p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                  isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{r.title}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}>
                      {r.sourceModule}
                    </span>
                  </div>
                  <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{r.description}</p>
                  <p className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Evidence: {r.evidence}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Impact Score</div>
                  <div
                    className={`font-mono font-bold ${
                      r.impactScore > 40
                        ? 'text-rose-500'
                        : r.impactScore > 10
                        ? 'text-amber-500'
                        : 'text-emerald-500'
                    }`}
                  >
                    {r.impactScore > 0 ? `+${r.impactScore}` : r.impactScore}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm backdrop-blur-md ${
        isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white shadow-slate-100'
      }`}>
        <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Risk calculations complete. Proceed to view final 5-step decision timeline and evidence dossier.
        </div>

        <button
          type="button"
          onClick={onProceedToFinalDecision}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
        >
          <span>Proceed to Step 5: Final Decision Verdict</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const RiskDashboardPage: React.FC<{
  currentCase: SampleCase;
}> = ({ currentCase }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [riskDecision, setRiskDecision] = useState<AggregatedRiskDecision>(currentCase.riskDecision);

  useEffect(() => {
    setRiskDecision(currentCase.riskDecision);
  }, [currentCase]);

  return (
    <>
      <RiskDashboard
        riskDecision={riskDecision}
        onGenerateReport={() => setIsModalOpen(true)}
        onProceedToFinalDecision={() => {}}
      />
      <CybercrimeReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        riskDecision={riskDecision}
        docResult={currentCase.docAnalysis}
      />
    </>
  );
};
