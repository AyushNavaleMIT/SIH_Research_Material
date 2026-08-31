import React from 'react';
import { 
  FileText, 
  Smile, 
  UserCheck, 
  ShieldAlert, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Loader2, 
  RefreshCw, 
  AlertCircle 
} from 'lucide-react';
import type { ScreeningStage, StepStatus, PipelineState } from '../types';
import { useTheme } from '../context/ThemeContext';

interface StepperProps {
  currentStage: ScreeningStage;
  pipelineState: PipelineState;
  onSelectStage: (stage: ScreeningStage) => void;
  canAccessStage: (stage: ScreeningStage) => boolean;
}

interface StepItem {
  id: ScreeningStage;
  stepNumber: number;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
}

export const STEPPER_ITEMS: StepItem[] = [
  {
    id: 'DOC_ANALYSIS',
    stepNumber: 1,
    label: '1. Document Verification',
    shortLabel: '1. Document',
    description: 'OCR extraction, Verhoeff & structural checks',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: 'LIVENESS_CHECK',
    stepNumber: 2,
    label: '2. Active Liveness',
    shortLabel: '2. Liveness',
    description: 'Temporal blinks & head pose validation',
    icon: <Smile className="w-4 h-4" />,
  },
  {
    id: 'FACE_VERIFY',
    stepNumber: 3,
    label: '3. Biometric Face Match',
    shortLabel: '3. Face Match',
    description: '1:1 facial embedding match with document',
    icon: <UserCheck className="w-4 h-4" />,
  },
  {
    id: 'RISK_ANALYSIS',
    stepNumber: 4,
    label: '4. Risk Engine',
    shortLabel: '4. Risk Engine',
    description: 'Multi-signal evidence synthesis & scoring',
    icon: <ShieldAlert className="w-4 h-4" />,
  },
  {
    id: 'FINAL_DECISION',
    stepNumber: 5,
    label: '5. Final Decision',
    shortLabel: '5. Final Verdict',
    description: 'Verification summary & incident dossier',
    icon: <Award className="w-4 h-4" />,
  },
];

export const Stepper: React.FC<StepperProps> = ({
  currentStage,
  pipelineState,
  onSelectStage,
  canAccessStage,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getStatusBadge = (status: StepStatus) => {
    switch (status) {
      case 'PASSED':
      case 'COMPLETED':
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
            isDark 
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
              : 'text-emerald-700 bg-emerald-50 border-emerald-200'
          }`}>
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> PASSED
          </span>
        );
      case 'FAILED':
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
            isDark 
              ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
              : 'text-rose-700 bg-rose-50 border-rose-200'
          }`}>
            <XCircle className="w-3 h-3 text-rose-500" /> FAILED
          </span>
        );
      case 'RECAPTURE_REQUIRED':
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
            isDark 
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
              : 'text-amber-700 bg-amber-50 border-amber-200'
          }`}>
            <RefreshCw className="w-3 h-3" /> RECAPTURE
          </span>
        );
      case 'PROCESSING':
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
            isDark 
              ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
              : 'text-blue-700 bg-blue-50 border-blue-200'
          }`}>
            <Loader2 className="w-3 h-3 animate-spin" /> RUNNING
          </span>
        );
      case 'READY':
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
            isDark 
              ? 'text-slate-200 bg-slate-800 border-slate-700' 
              : 'text-slate-700 bg-slate-100 border-slate-300'
          }`}>
            <AlertCircle className="w-3 h-3 text-blue-500" /> READY
          </span>
        );
      case 'LOCKED':
      default:
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${
            isDark 
              ? 'text-slate-500 bg-slate-900/60 border-slate-800' 
              : 'text-slate-400 bg-slate-100 border-slate-200'
          }`}>
            <Lock className="w-3 h-3" /> LOCKED
          </span>
        );
    }
  };

  return (
    <div className={`w-full border rounded-xl p-3 md:p-3.5 shadow-sm backdrop-blur-md transition-colors ${
      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-slate-100'
    }`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {STEPPER_ITEMS.map((item) => {
          const status = pipelineState[item.id] || 'LOCKED';
          const isCurrent = currentStage === item.id;
          const isAccessible = canAccessStage(item.id);
          const isCompleted = status === 'PASSED' || status === 'COMPLETED';
          const isFailed = status === 'FAILED';

          let buttonStyle = '';
          if (isCurrent) {
            buttonStyle = isDark
              ? 'border-blue-500 bg-blue-950/30 text-white ring-1 ring-blue-500/40 shadow-sm'
              : 'border-blue-600 bg-blue-50/70 text-slate-900 ring-1 ring-blue-500/30 shadow-sm';
          } else if (isCompleted) {
            buttonStyle = isDark
              ? 'border-emerald-500/25 bg-emerald-950/10 hover:border-emerald-500/40 text-slate-200 cursor-pointer'
              : 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 text-slate-800 cursor-pointer';
          } else if (isFailed) {
            buttonStyle = isDark
              ? 'border-rose-500/30 bg-rose-950/15 hover:border-rose-500/50 text-slate-200 cursor-pointer'
              : 'border-rose-200 bg-rose-50/50 hover:border-rose-300 text-slate-800 cursor-pointer';
          } else if (isAccessible) {
            buttonStyle = isDark
              ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/40 text-slate-200 cursor-pointer'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 text-slate-800 cursor-pointer';
          } else {
            buttonStyle = isDark
              ? 'border-slate-800/50 bg-slate-950/40 opacity-40 cursor-not-allowed text-slate-500'
              : 'border-slate-200 bg-slate-100/60 opacity-50 cursor-not-allowed text-slate-400';
          }

          return (
            <button
              key={item.id}
              type="button"
              disabled={!isAccessible}
              onClick={() => onSelectStage(item.id)}
              className={`flex flex-col text-left p-3 rounded-lg transition-all duration-150 border relative ${buttonStyle}`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-semibold ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                      : isFailed
                      ? isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-100 text-rose-700'
                      : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? '✓' : isFailed ? '✕' : item.stepNumber}
                </div>
                {getStatusBadge(status)}
              </div>

              <div className={`text-xs font-semibold truncate ${
                isCurrent 
                  ? (isDark ? 'text-white' : 'text-blue-900') 
                  : (isDark ? 'text-slate-200' : 'text-slate-800')
              }`}>
                {item.shortLabel}
              </div>
              <div className={`text-[10px] truncate mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {item.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
