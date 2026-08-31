import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, BarChart2 } from 'lucide-react';
import type { AggregatedRiskDecision, RiskBreakdownItem } from '../types';
import { useTheme } from '../context/ThemeContext';

interface RiskCardProps {
  decision: AggregatedRiskDecision;
  onManualOverride?: (action: 'PASS' | 'MANUAL_REVIEW' | 'REJECT') => void;
}

export const RiskCard: React.FC<RiskCardProps> = ({ decision, onManualOverride }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { overallRiskScore, overallStatus, recommendedAction, breakdown } = decision;

  const isHigh = overallStatus === 'HIGH';
  const isMed = overallStatus === 'MEDIUM';

  const riskDimensionList: RiskBreakdownItem[] = [
    breakdown.documentTampering,
    breakdown.dataConsistency,
    breakdown.faceMatch,
    breakdown.liveness,
    breakdown.imageQuality,
  ];

  return (
    <div className="space-y-6">
      {/* TOP SECTION: Final Risk Score & Recommended Action Banner */}
      <div
        className={`border rounded-xl p-6 shadow-sm relative overflow-hidden transition-all ${
          isHigh
            ? isDark ? 'bg-slate-900 border-rose-800/80 shadow-rose-950/20' : 'bg-white border-rose-300 shadow-rose-50'
            : isMed
            ? isDark ? 'bg-slate-900 border-amber-800/80 shadow-amber-950/20' : 'bg-white border-amber-300 shadow-amber-50'
            : isDark ? 'bg-slate-900 border-emerald-800/80 shadow-emerald-950/20' : 'bg-white border-emerald-300 shadow-emerald-50'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Column 1: Big Risk Score Meter */}
          <div className="flex items-center space-x-5">
            <div
              className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 shrink-0 shadow-sm ${
                isHigh
                  ? isDark ? 'bg-rose-950 text-rose-400 border-rose-500' : 'bg-rose-50 text-rose-700 border-rose-300'
                  : isMed
                  ? isDark ? 'bg-amber-950 text-amber-400 border-amber-500' : 'bg-amber-50 text-amber-700 border-amber-300'
                  : isDark ? 'bg-emerald-950 text-emerald-400 border-emerald-500' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}
            >
              <span className="text-3xl font-mono font-extrabold tracking-tight">
                {overallRiskScore.toFixed(1)}
              </span>
              <span className={`text-[10px] font-mono uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                / 100 Risk
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-mono uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Final Risk Status:</span>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-extrabold border ${
                    isHigh
                      ? isDark ? 'bg-rose-900/90 text-rose-200 border-rose-700' : 'bg-rose-100 text-rose-800 border-rose-300'
                      : isMed
                      ? isDark ? 'bg-amber-900/90 text-amber-200 border-amber-700' : 'bg-amber-100 text-amber-800 border-amber-300'
                      : isDark ? 'bg-emerald-900/90 text-emerald-200 border-emerald-700' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {overallStatus} RISK
                </span>
              </div>
              <h3 className={`text-lg font-bold mt-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{decision.applicantName || 'XYZ'}</h3>
              <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Case ID: {decision.caseId} &bull; {decision.documentType}
              </p>
            </div>
          </div>

          {/* Column 2: Recommended System Action */}
          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] font-mono uppercase font-bold block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              AI Decision Engine Output:
            </span>
            <div className="flex items-center space-x-3">
              {recommendedAction === 'PASS' && (
                <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 ${
                  isDark ? 'bg-emerald-950 text-emerald-400 border-emerald-700' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  RECOMMENDED ACTION: APPROVED (PASS)
                </div>
              )}
              {recommendedAction === 'MANUAL_REVIEW' && (
                <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 ${
                  isDark ? 'bg-amber-950 text-amber-400 border-amber-700' : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  RECOMMENDED ACTION: MANUAL REVIEW
                </div>
              )}
              {recommendedAction === 'REJECT' && (
                <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 ${
                  isDark ? 'bg-rose-950 text-rose-400 border-rose-700' : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}>
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  RECOMMENDED ACTION: REJECT (HIGH RISK)
                </div>
              )}
            </div>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Evaluated across 5 risk dimensions using weighted Bayesian decision classifier.
            </p>
          </div>

          {/* Column 3: Analyst Manual Override Buttons */}
          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] font-mono uppercase font-bold block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Analyst Manual Override:
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onManualOverride && onManualOverride('PASS')}
                className={`flex-1 py-1.5 rounded text-xs font-mono font-semibold border transition-all cursor-pointer ${
                  isDark ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => onManualOverride && onManualOverride('MANUAL_REVIEW')}
                className={`flex-1 py-1.5 rounded text-xs font-mono font-semibold border transition-all cursor-pointer ${
                  isDark ? 'bg-amber-950 hover:bg-amber-900 text-amber-300 border-amber-800' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                Hold
              </button>
              <button
                type="button"
                onClick={() => onManualOverride && onManualOverride('REJECT')}
                className={`flex-1 py-1.5 rounded text-xs font-mono font-semibold border transition-all cursor-pointer ${
                  isDark ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border-rose-800' : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
                }`}
              >
                Reject
              </button>
            </div>
            {decision.analystOverride && (
              <p className="text-[10px] text-blue-500 font-mono">
                Overridden by {decision.analystOverride.analystName} ({decision.analystOverride.action})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: 5 Risk Dimension Breakdown Charts */}
      <div className={`border rounded-xl p-5 shadow-sm space-y-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <BarChart2 className="w-4 h-4 text-blue-500" />
              Risk Dimension Breakdown
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              5 Modular AI Risk Scores (Weighted Score Aggregation)
            </p>
          </div>
          <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Total Weight: 100%
          </span>
        </div>

        {/* Progress Bars for the 5 Dimensions */}
        <div className="space-y-3">
          {riskDimensionList.map((item) => {
            const isItemHigh = item.status === 'HIGH';
            const isItemMed = item.status === 'MEDIUM';

            return (
              <div key={item.id} className={`p-3.5 rounded-lg border space-y-2 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.name}</span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>(Weight: {item.weight}%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{item.score.toFixed(1)} / 100</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        isItemHigh
                          ? isDark ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-rose-50 text-rose-700 border-rose-200'
                          : isItemMed
                          ? isDark ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200'
                          : isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className={`w-full h-2.5 rounded-full overflow-hidden border ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'
                }`}>
                  <div
                    style={{ width: `${item.score}%` }}
                    className={`h-full transition-all duration-700 ${
                      isItemHigh ? 'bg-rose-500' : isItemMed ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  ></div>
                </div>

                <p className={`text-[11px] font-mono leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {item.details}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
