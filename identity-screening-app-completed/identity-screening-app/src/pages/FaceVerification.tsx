import React from 'react';
import type { SampleCase } from '../types';
import { WebcamCapture } from '../components/WebcamCapture';
import { LivenessChallenge } from '../components/LivenessChallenge';

interface FaceVerificationProps {
  currentCase: SampleCase;
  onNextStage?: () => void;
}

export const FaceVerificationPage: React.FC<FaceVerificationProps> = ({
  currentCase,
  onNextStage,
}) => {
  const isHighRiskDemo = currentCase.expectedStatus === 'HIGH';

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-purple-400">
            <span>MODULE 7</span>
            <span>&bull;</span>
            <span className="uppercase">BIOMETRIC 3D MATCH & ACTIVE LIVENESS</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Face Verification & Active Liveness Check
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            128-dimensional facial embedding vector comparison and real-time interactive motion liveness challenge.
          </p>
        </div>

        {/* Biometric Status Pill */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-purple-500 animate-ping"></div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">ACTIVE MODEL</span>
            <span className="font-bold text-purple-300">FaceNet-v4 + DeepLiveness 3D</span>
          </div>
        </div>
      </div>

      {/* Grid: Live Camera & Face Similarity Card */}
      <WebcamCapture faceResult={currentCase.faceVerification} />

      {/* Active Liveness Challenge Component (Shows ONLY 1 Active Challenge at a time) */}
      <LivenessChallenge
        onChallengeComplete={() => {
          console.log('Liveness completed');
        }}
        isHighRiskDemo={isHighRiskDemo}
      />

      {/* Footer Navigation Trigger */}
      {onNextStage && (
        <div className="flex justify-end pt-2">
          <button
            onClick={onNextStage}
            className="px-5 py-2.5 bg-cyan-500 text-slate-950 font-mono font-bold text-xs rounded-lg hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
          >
            Proceed to Explainable Risk Dashboard &rarr;
          </button>
        </div>
      )}
    </div>
  );
};
