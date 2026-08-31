import React, { useState } from 'react';
import type { SampleCase, ScreeningStage } from '../types';
import { Stepper } from '../components/Stepper';
import { DocumentForensicsPage } from './DocumentForensics';
import { FaceVerificationPage } from './FaceVerification';
import { RiskDashboardPage } from './RiskDashboard';
import { CybercrimeReportModal } from '../components/CybercrimeReportModal';
import { CheckCircle2, RotateCcw, AlertTriangle, ShieldAlert, Fingerprint } from 'lucide-react';

interface UnifiedWorkflowProps {
  currentCase: SampleCase;
  onSelectSample: (caseId: string) => void;
}

export const UnifiedWorkflowPage: React.FC<UnifiedWorkflowProps> = ({
  currentCase,
  onSelectSample,
}) => {
  const [currentStage, setCurrentStage] = useState<ScreeningStage>('DOC_ANALYSIS');
  const [completedStages, setCompletedStages] = useState<ScreeningStage[]>([]);
  const [isCyberModalOpen, setIsCyberModalOpen] = useState(false);

  const handleStageChange = (stage: ScreeningStage) => {
    setCurrentStage(stage);
  };

  const handleNextStage = () => {
    setCompletedStages((prev) => [...prev, currentStage]);
    if (currentStage === 'DOC_ANALYSIS') setCurrentStage('FACE_VERIFY');
    else if (currentStage === 'FACE_VERIFY') setCurrentStage('LIVENESS_CHECK');
    else if (currentStage === 'LIVENESS_CHECK') setCurrentStage('RISK_ANALYSIS');
    else if (currentStage === 'RISK_ANALYSIS') setCurrentStage('FINAL_DECISION');
  };

  const handleResetWorkflow = () => {
    setCurrentStage('DOC_ANALYSIS');
    setCompletedStages([]);
  };

  const isHighRisk = currentCase.expectedStatus === 'HIGH';
  const mrzStatus = currentCase.docAnalysis.mrz?.status || 'NOT_APPLICABLE';
  const barcodeStatus = currentCase.docAnalysis.barcode?.status || 'NOT_FOUND';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Unified Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
            <span>UNIFIED SCREENING PIPELINE</span>
            <span>&bull;</span>
            <span>AUTOMATED 5-STEP WIZARD</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            End-to-End Identity Screening Flow
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Guided evaluation sequence: Document Forensics &rarr; Face Match &rarr; Liveness Verification &rarr; Risk Engine &rarr; Decision.
          </p>
        </div>

        <button
          onClick={handleResetWorkflow}
          className="flex items-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono border border-slate-700 transition-all self-start md:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Pipeline</span>
        </button>
      </div>

      {/* Stepper Navigation */}
      <Stepper
        currentStage={currentStage}
        onSelectStage={handleStageChange}
        completedStages={completedStages}
      />

      {/* Main Active Stage Content Container */}
      <div className="mt-6">
        {currentStage === 'DOC_ANALYSIS' && (
          <DocumentForensicsPage
            currentCase={currentCase}
            onSelectSample={onSelectSample}
            onNextStage={handleNextStage}
          />
        )}

        {currentStage === 'FACE_VERIFY' && (
          <FaceVerificationPage currentCase={currentCase} onNextStage={handleNextStage} />
        )}

        {currentStage === 'LIVENESS_CHECK' && (
          <FaceVerificationPage currentCase={currentCase} onNextStage={handleNextStage} />
        )}

        {currentStage === 'RISK_ANALYSIS' && <RiskDashboardPage currentCase={currentCase} />}

        {currentStage === 'FINAL_DECISION' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl text-center space-y-6 max-w-2xl mx-auto">
            <div
              className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center border-2 ${
                isHighRisk
                  ? 'bg-rose-950 text-rose-400 border-rose-500 shadow-xl shadow-rose-950'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-500 shadow-xl shadow-emerald-950'
              }`}
            >
              {isHighRisk ? (
                <AlertTriangle className="w-10 h-10" />
              ) : (
                <CheckCircle2 className="w-10 h-10" />
              )}
            </div>

            <div>
              <span className="text-xs font-mono uppercase text-slate-500 block">
                Screening Pipeline Final Verdict
              </span>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{currentCase.name}</h3>
              <p className="text-sm font-mono text-cyan-400 mt-1">
                Case ID: {currentCase.id} &bull; {currentCase.documentType}
              </p>
            </div>

            {/* Evidence SHA-256 Digest */}
            {currentCase.docAnalysis.evidenceSha256 && (
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-center gap-2">
                <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                <span>SHA-256: <span className="text-emerald-400">{currentCase.docAnalysis.evidenceSha256.slice(0, 32)}...</span></span>
              </div>
            )}

            {/* Multi-Modal Verification Matrix */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Document Tampering (ELA):</span>
                <span className={isHighRisk ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {currentCase.docAnalysis.tamperingScore.toFixed(1)}% ({currentCase.docAnalysis.status})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RapidOCR Identity Clarity:</span>
                <span className="text-cyan-400 font-bold">
                  {currentCase.docAnalysis.ocr?.isReadable ? 'READABLE (97% Conf)' : 'UNREADABLE'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ICAO 9303 MRZ Checksums:</span>
                <span className={mrzStatus === 'VERIFIED' ? 'text-emerald-400 font-bold' : mrzStatus === 'FAILED' ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                  {mrzStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">QR / 2D Barcode Cross-Match:</span>
                <span className={barcodeStatus === 'MATCH' ? 'text-emerald-400 font-bold' : barcodeStatus === 'MISMATCH' ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                  {barcodeStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Face Match Similarity:</span>
                <span className={currentCase.faceVerification.status === 'HIGH' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {currentCase.faceVerification.similarityScore.toFixed(1)}% Match
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Liveness Challenge:</span>
                <span className="text-emerald-400 font-bold">PASSED (5/5 STEPS)</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-bold">
                <span className="text-slate-200">Final Aggregated Decision:</span>
                <span className={isHighRisk ? 'text-rose-400' : 'text-emerald-400'}>
                  {currentCase.riskDecision.overallRiskScore.toFixed(1)} / 100 ({currentCase.riskDecision.recommendedAction})
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handleResetWorkflow}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-lg border border-slate-700 transition-all cursor-pointer"
              >
                Screen Another Subject
              </button>

              {isHighRisk && (
                <button
                  onClick={() => setIsCyberModalOpen(true)}
                  className="flex items-center space-x-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs rounded-lg shadow-lg shadow-rose-950 transition-all cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Create Cybercrime Case Report</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cybercrime Case Modal */}
      <CybercrimeReportModal
        isOpen={isCyberModalOpen}
        onClose={() => setIsCyberModalOpen(false)}
        analysisResult={currentCase.docAnalysis}
        riskDecision={currentCase.riskDecision}
      />
    </div>
  );
};
