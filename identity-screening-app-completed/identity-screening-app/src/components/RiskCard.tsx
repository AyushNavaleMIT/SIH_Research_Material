import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, BarChart2 } from 'lucide-react';
import type { AggregatedRiskDecision, RiskBreakdownItem } from '../types';

interface RiskCardProps {
  decision: AggregatedRiskDecision;
  onManualOverride?: (action: 'PASS' | 'MANUAL_REVIEW' | 'REJECT') => void;
}

export const RiskCard: React.FC<RiskCardProps> = ({ decision, onManualOverride }) => {
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
        className={`bg-slate-900 border rounded-xl p-6 shadow-xl relative overflow-hidden transition-all ${
          isHigh
            ? 'border-rose-800/80 shadow-rose-950/20'
            : isMed
            ? 'border-amber-800/80 shadow-amber-950/20'
            : 'border-emerald-800/80 shadow-emerald-950/20'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Column 1: Big Risk Score Meter */}
          <div className="flex items-center space-x-5">
            <div
              className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 shrink-0 shadow-2xl ${
                isHigh
                  ? 'bg-rose-950 text-rose-400 border-rose-500 shadow-rose-950'
                  : isMed
                  ? 'bg-amber-950 text-amber-400 border-amber-500 shadow-amber-950'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-500 shadow-emerald-950'
              }`}
            >
              <span className="text-3xl font-mono font-extrabold tracking-tight">
                {overallRiskScore.toFixed(1)}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                / 100 Risk
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono uppercase text-slate-400">Final Risk Status:</span>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-extrabold border ${
                    isHigh
                      ? 'bg-rose-900/90 text-rose-200 border-rose-700'
                      : isMed
                      ? 'bg-amber-900/90 text-amber-200 border-amber-700'
                      : 'bg-emerald-900/90 text-emerald-200 border-emerald-700'
                  }`}
                >
                  {overallStatus} RISK
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mt-1">{decision.applicantName}</h3>
              <p className="text-xs text-slate-400 font-mono">
                Case ID: {decision.caseId} &bull; {decision.documentType}
              </p>
            </div>
          </div>

          {/* Column 2: Recommended System Action */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
              AI Decision Engine Output:
            </span>
            <div className="flex items-center space-x-3">
              {recommendedAction === 'PASS' && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-700 text-sm font-mono font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  RECOMMENDED ACTION: APPROVED (PASS)
                </div>
              )}
              {recommendedAction === 'MANUAL_REVIEW' && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-950 text-amber-400 border border-amber-700 text-sm font-mono font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  RECOMMENDED ACTION: MANUAL REVIEW
                </div>
              )}
              {recommendedAction === 'REJECT' && (
                <div className="px-3 py-1.5 rounded-lg bg-rose-950 text-rose-400 border border-rose-700 text-sm font-mono font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  RECOMMENDED ACTION: REJECT (HIGH RISK)
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Evaluated across 5 risk dimensions using weighted Bayesian decision classifier.
            </p>
          </div>

          {/* Column 3: Analyst Manual Override Buttons */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
              Analyst Manual Override:
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onManualOverride && onManualOverride('PASS')}
                className="flex-1 py-1.5 rounded text-xs font-mono font-semibold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-all"
              >
                Approve
              </button>
              <button
                onClick={() => onManualOverride && onManualOverride('MANUAL_REVIEW')}
                className="flex-1 py-1.5 rounded text-xs font-mono font-semibold bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 transition-all"
              >
                Hold
              </button>
              <button
                onClick={() => onManualOverride && onManualOverride('REJECT')}
                className="flex-1 py-1.5 rounded text-xs font-mono font-semibold bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-all"
              >
                Reject
              </button>
            </div>
            {decision.analystOverride && (
              <p className="text-[10px] text-cyan-400 font-mono">
                Overridden by {decision.analystOverride.analystName} ({decision.analystOverride.action})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: 5 Risk Dimension Breakdown Charts */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Risk Dimension Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              5 Modular AI Risk Scores (Weighted Score Aggregation)
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Total Weight: 100%
          </span>
        </div>

        {/* Progress Bars for the 5 Dimensions */}
        <div className="space-y-3">
          {riskDimensionList.map((item) => {
            const isItemHigh = item.status === 'HIGH';
            const isItemMed = item.status === 'MEDIUM';

            return (
              <div key={item.id} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200">{item.name}</span>
                    <span className="text-[10px] text-slate-500">(Weight: {item.weight}%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-100">{item.score.toFixed(1)} / 100</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        isItemHigh
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : isItemMed
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    style={{ width: `${item.score}%` }}
                    className={`h-full transition-all duration-700 ${
                      isItemHigh ? 'bg-rose-500' : isItemMed ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  ></div>
                </div>

                <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
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
