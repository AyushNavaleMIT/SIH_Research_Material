import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  Scan, 
  ShieldCheck, 
  FileText, 
  Search, 
  Cpu, 
  Layers, 
  Lock 
} from 'lucide-react';

interface DocumentProcessingScannerProps {
  documentPreviewUrl?: string;
  fileName?: string;
  isCompleted: boolean;
  onScanFinished: () => void;
  error?: string | null;
}

interface ScanStep {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const SCAN_STEPS: ScanStep[] = [
  { id: 'upload', label: 'Upload received & SHA-256 integrity digest created', icon: <Lock className="w-3.5 h-3.5" /> },
  { id: 'quality', label: 'Image quality & optical gate assessment (blur, glare, resolution)', icon: <Search className="w-3.5 h-3.5" /> },
  { id: 'rectify', label: 'Document boundary detection & perspective rectification', icon: <Scan className="w-3.5 h-3.5" /> },
  { id: 'ocr', label: 'RapidOCR neural text & character extraction', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'classify', label: 'Document type classification (Aadhaar / PAN / Passport / DL)', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'fields', label: 'Field-aware demographic isolation (Name, DOB, Number, Address)', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'checksum', label: 'Structural layout & Verhoeff / ICAO MRZ checksum validation', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: 'forensics', label: 'Multi-signal Error Level Analysis (ELA) & tamper localization', icon: <Cpu className="w-3.5 h-3.5" /> },
  { id: 'complete', label: 'Forensic assessment synthesized & verification ready', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

export const DocumentProcessingScanner: React.FC<DocumentProcessingScannerProps> = ({
  documentPreviewUrl,
  fileName,
  isCompleted,
  onScanFinished,
  error,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [progressPct, setProgressPct] = useState<number>(10);

  useEffect(() => {
    if (error) return;

    // Fast, crisp stepped interval
    const interval = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev < SCAN_STEPS.length - 2) {
          const next = prev + 1;
          setProgressPct(Math.round(((next + 1) / SCAN_STEPS.length) * 90));
          return next;
        }
        return prev;
      });
    }, 380);

    return () => clearInterval(interval);
  }, [error]);

  // When backend analysis finishes, fast-forward to 100% and notify
  useEffect(() => {
    if (isCompleted && !error) {
      setCurrentStepIdx(SCAN_STEPS.length - 1);
      setProgressPct(100);
      const timer = setTimeout(() => {
        onScanFinished();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, error, onScanFinished]);

  return (
    <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Scan className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Multi-Stage Forensic Pipeline in Progress</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {progressPct}% COMPLETE
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Analyzing {fileName || 'uploaded document'} across 9 optical, structural & forensic checkpoints.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-xs font-mono text-cyan-300 font-semibold">PROCESSING</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-md shadow-cyan-500/50"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Dual Column: Laser Scanned Preview + Real-time Checkpoints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Left: Document with Glowing Laser Scan Line */}
        <div className="relative rounded-xl overflow-hidden border-2 border-cyan-500/40 bg-slate-950 aspect-[4/3] flex items-center justify-center shadow-inner">
          {documentPreviewUrl ? (
            <img
              src={documentPreviewUrl}
              alt="Scanning Document"
              className="w-full h-full object-contain filter contrast-105"
            />
          ) : (
            <div className="text-xs text-slate-500 font-mono">DOCUMENT PREVIEW</div>
          )}

          {/* Animated Scanning Laser Line */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-scan-line"></div>
            <div className="absolute inset-0 bg-cyan-500/5 animate-pulse pointer-events-none"></div>
          </div>

          {/* Overlay Tag */}
          <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-[10px] font-mono text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span>REAL-TIME SENSOR ANALYSIS</span>
          </div>
        </div>

        {/* Right: Sequential Processing Step Checklist */}
        <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800 max-h-72 overflow-y-auto">
          {SCAN_STEPS.map((step, idx) => {
            const isDone = idx < currentStepIdx || progressPct === 100;
            const isCurrent = idx === currentStepIdx && progressPct < 100;

            return (
              <div
                key={step.id}
                className={`p-2 rounded-lg flex items-center justify-between text-xs transition-all duration-200 ${
                  isDone
                    ? 'bg-slate-900/80 text-slate-300 border border-slate-800/80'
                    : isCurrent
                    ? 'bg-cyan-950/60 text-cyan-200 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-500 opacity-40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : isCurrent
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-800 text-slate-600'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : isCurrent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : step.icon}
                  </div>
                  <span className={`text-[11px] font-medium ${isCurrent ? 'font-bold text-cyan-300' : ''}`}>
                    {step.label}
                  </span>
                </div>

                {isDone && (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">OK</span>
                )}
                {isCurrent && (
                  <span className="text-[10px] font-mono text-cyan-400 font-bold animate-pulse">RUNNING</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
