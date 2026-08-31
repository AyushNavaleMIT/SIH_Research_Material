import React, { useState, useEffect } from 'react';
import { ShieldCheck, Eye, ArrowLeft, ArrowRight, CheckCircle2, RefreshCw, Play } from 'lucide-react';
import type { LivenessChallengeStep } from '../types';

interface LivenessChallengeProps {
  onChallengeComplete?: () => void;
  isHighRiskDemo?: boolean;
}

export const LIVENESS_STEPS: {
  id: LivenessChallengeStep;
  stepNum: number;
  title: string;
  instruction: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'DETECT_FACE',
    stepNum: 1,
    title: 'Face Detected',
    instruction: 'Position your face clearly inside the oval target frame.',
    icon: ShieldCheck,
  },
  {
    id: 'BLINK_TWICE',
    stepNum: 2,
    title: 'Blink Twice',
    instruction: 'Blink both eyes naturally twice to verify natural eyelid movement.',
    icon: Eye,
  },
  {
    id: 'TURN_LEFT',
    stepNum: 3,
    title: 'Turn Head Left',
    instruction: 'Slowly rotate your head 30 degrees to your LEFT.',
    icon: ArrowLeft,
  },
  {
    id: 'TURN_RIGHT',
    stepNum: 4,
    title: 'Turn Head Right',
    instruction: 'Slowly rotate your head 30 degrees to your RIGHT.',
    icon: ArrowRight,
  },
  {
    id: 'COMPLETE',
    stepNum: 5,
    title: 'Verification Complete',
    instruction: 'Active liveness response successfully validated by 3D mesh engine.',
    icon: CheckCircle2,
  },
];

export const LivenessChallenge: React.FC<LivenessChallengeProps> = ({
  onChallengeComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [isPassed, setIsPassed] = useState(false);

  const activeChallenge = LIVENESS_STEPS[currentStepIndex];

  // Auto timer decrement for step
  useEffect(() => {
    if (activeChallenge.id === 'COMPLETE') return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 15));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStepIndex, activeChallenge.id]);

  const handleNextChallenge = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCompletedSteps((prev) => [...prev, currentStepIndex]);
      if (currentStepIndex < LIVENESS_STEPS.length - 1) {
        const nextIdx = currentStepIndex + 1;
        setCurrentStepIndex(nextIdx);
        setTimerSeconds(15);
        if (nextIdx === LIVENESS_STEPS.length - 1) {
          setIsPassed(true);
          if (onChallengeComplete) onChallengeComplete();
        }
      }
    }, 800);
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setTimerSeconds(15);
    setIsPassed(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      {/* Top Title & Step Progress Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Active Biometric Liveness Challenge
          </h3>
          <p className="text-xs text-slate-400">
            Interactive prompt sequence preventing 2D print & 3D deepfake spoof attacks
          </p>
        </div>

        {/* Challenge Step Tracker Badges */}
        <div className="flex items-center space-x-1.5">
          {LIVENESS_STEPS.map((step, idx) => {
            const isDone = completedSteps.includes(idx) || (isPassed && idx === 4);
            const isCurrent = idx === currentStepIndex && !isPassed;
            return (
              <div
                key={step.id}
                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-mono font-bold transition-all ${
                  isDone
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                    : isCurrent
                    ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400/50'
                    : 'bg-slate-950 text-slate-600 border border-slate-800'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* SINGLE ACTIVE CHALLENGE PROMPT CARD (Requirement: Show only one active challenge at a time) */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
        {/* Step indicator header tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono font-semibold text-cyan-400">
          <span>CHALLENGE {activeChallenge.stepNum} OF 5</span>
          <span>&bull;</span>
          <span className="text-slate-300">{activeChallenge.title}</span>
        </div>

        {/* Dynamic Big Icon for the ACTIVE Challenge Only */}
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 transition-all ${
              activeChallenge.id === 'COMPLETE'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-xl shadow-emerald-950'
                : isProcessing
                ? 'bg-slate-900 border-cyan-400 text-cyan-400 animate-pulse'
                : 'bg-slate-900 border-slate-700 text-cyan-400 shadow-inner'
            }`}
          >
            {React.createElement(activeChallenge.icon, { className: 'w-10 h-10' })}
          </div>
          {activeChallenge.id !== 'COMPLETE' && (
            <div className="absolute -bottom-2 -right-2 bg-slate-900 text-slate-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700">
              {timerSeconds}s
            </div>
          )}
        </div>

        {/* Main Instruction Text */}
        <div className="max-w-md space-y-1">
          <h4 className="text-base font-bold text-slate-100">{activeChallenge.title}</h4>
          <p className="text-xs text-slate-300 leading-relaxed font-mono">
            {activeChallenge.instruction}
          </p>
        </div>

        {/* Interactive Action Button for Demo */}
        {activeChallenge.id !== 'COMPLETE' ? (
          <button
            onClick={handleNextChallenge}
            disabled={isProcessing}
            className={`px-6 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center space-x-2 transition-all ${
              isProcessing
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-wait'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 active:scale-95'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Verifying Biometric Motion...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Simulate Action: {activeChallenge.title}</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center space-x-3">
            <span className="px-4 py-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              LIVENESS VERIFIED (PASSED)
            </span>
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-mono border border-slate-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restart Test
            </button>
          </div>
        )}
      </div>

      {/* Liveness Telemetry Footnote */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-400">
        <div>
          <span className="text-slate-500 block text-[9px]">3D MAP DENSITY</span>
          <span className="text-slate-200">1,024 Point Cloud</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px]">PUPIL DILATION</span>
          <span className="text-emerald-400">ORGANIC (PASS)</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px]">SPECULAR REFLECTION</span>
          <span className="text-emerald-400">NATURAL DERMA</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px]">SPOOF RISK</span>
          <span className="text-cyan-400 font-bold">2.4% (LOW)</span>
        </div>
      </div>
    </div>
  );
};
