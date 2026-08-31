import React from 'react';
import type { ScreeningStage } from '../types';
import { CheckCircle2, FileSearch, UserCheck, Shield, PieChart, Award } from 'lucide-react';

interface StepperProps {
  currentStage: ScreeningStage;
  onSelectStage?: (stage: ScreeningStage) => void;
  completedStages?: ScreeningStage[];
}

export const STEPPER_ITEMS: { id: ScreeningStage; label: string; icon: React.ElementType }[] = [
  { id: 'DOC_ANALYSIS', label: 'Document Analysis', icon: FileSearch },
  { id: 'FACE_VERIFY', label: 'Face Verification', icon: UserCheck },
  { id: 'LIVENESS_CHECK', label: 'Liveness Check', icon: Shield },
  { id: 'RISK_ANALYSIS', label: 'Risk Analysis', icon: PieChart },
  { id: 'FINAL_DECISION', label: 'Final Decision', icon: Award },
];

export const Stepper: React.FC<StepperProps> = ({
  currentStage,
  onSelectStage,
  completedStages = [],
}) => {
  const currentIndex = STEPPER_ITEMS.findIndex((item) => item.id === currentStage);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex flex-col md:flex-row items-center justify-between gap-2 relative">
        {STEPPER_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const isCompleted = completedStages.includes(item.id) || idx < currentIndex;
          const isActive = item.id === currentStage;
          const isLast = idx === STEPPER_ITEMS.length - 1;

          return (
            <React.Fragment key={item.id}>
              {/* Step Item */}
              <button
                onClick={() => onSelectStage && onSelectStage(item.id)}
                disabled={!onSelectStage}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-left ${
                  onSelectStage ? 'cursor-pointer hover:bg-slate-800/80' : 'cursor-default'
                } ${
                  isActive
                    ? 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-950/50'
                    : isCompleted
                    ? 'text-emerald-400'
                    : 'text-slate-500'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400/40'
                      : isCompleted
                      ? 'bg-emerald-950 border border-emerald-500 text-emerald-400'
                      : 'bg-slate-800 border border-slate-700 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Step 0{idx + 1}
                  </div>
                  <div
                    className={`text-xs font-semibold whitespace-nowrap ${
                      isActive
                        ? 'text-cyan-300 font-bold'
                        : isCompleted
                        ? 'text-slate-200'
                        : 'text-slate-500'
                    }`}
                  >
                    {item.label}
                  </div>
                </div>
              </button>

              {/* Connector line */}
              {!isLast && (
                <div className="hidden md:block flex-1 h-[2px] mx-1">
                  <div
                    className={`h-full transition-all duration-500 ${
                      idx < currentIndex ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  ></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
