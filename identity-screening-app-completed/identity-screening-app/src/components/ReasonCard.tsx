import React from 'react';
import { HelpCircle, Info } from 'lucide-react';
import type { ExplainableReason } from '../types';

interface ReasonCardProps {
  reasons: ExplainableReason[];
}

export const ReasonCard: React.FC<ReasonCardProps> = ({ reasons }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            "Why Was This Decision Made?" (Explainable AI Attribution)
          </h3>
          <p className="text-xs text-slate-400">
            Shapley Value & Feature Weight Contributions driving the system recommendation
          </p>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
          XAI Engine v2.1
        </span>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reasons.map((reason) => {
          const isHigh = reason.severity === 'HIGH';
          const isMed = reason.severity === 'MEDIUM';

          return (
            <div
              key={reason.id}
              className={`bg-slate-950 p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                isHigh
                  ? 'border-rose-900/80 hover:border-rose-700'
                  : isMed
                  ? 'border-amber-900/80 hover:border-amber-700'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header Tag Bar */}
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-900 text-slate-300 border border-slate-700">
                    [{reason.category}] &bull; {reason.sourceModule}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      isHigh
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : isMed
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    {reason.severity} IMPACT
                  </span>
                </div>

                {/* Reason Title */}
                <h4 className="text-sm font-bold text-slate-100 flex items-center justify-between">
                  <span>{reason.title}</span>
                </h4>

                {/* Plain English Description */}
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-sans">
                  {reason.description}
                </p>
              </div>

              {/* Bottom Feature Weight Bar & Evidence */}
              <div className="space-y-2 pt-2 border-t border-slate-900">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-500">Feature Contribution Weight:</span>
                  <span className="text-cyan-400 font-bold">{reason.featureWeight}%</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${reason.featureWeight}%` }}
                    className={`h-full ${
                      isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  ></div>
                </div>

                <div className="bg-slate-900/80 p-2 rounded text-[11px] font-mono text-slate-400 flex items-start gap-1.5 border border-slate-850">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="truncate">Evidence: {reason.evidence}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
