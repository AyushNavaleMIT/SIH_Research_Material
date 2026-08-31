import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Eye, 
  ShieldCheck, 
  VideoOff, 
  ShieldAlert 
} from 'lucide-react';
import { CybercrimeReportModal } from './CybercrimeReportModal';
import { 
  getFaceLandmarker, 
  TemporalBlinkDetector 
} from '../services/livenessLandmarker';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';

import { useTheme } from '../context/ThemeContext';

interface LivenessChallengeProps {
  onComplete: (success: boolean) => void;
  onRetry: () => void;
}

interface ChallengeStep {
  id: 'BLINK_TWICE' | 'TURN_LEFT' | 'TURN_RIGHT';
  title: string;
  instruction: string;
  personGuidance: string;
  icon: React.ReactNode;
}

const CHALLENGES: ChallengeStep[] = [
  {
    id: 'BLINK_TWICE',
    title: 'Challenge 1 of 3: Natural Blink Detection',
    instruction: 'Look at the camera & blink naturally twice',
    personGuidance: 'Keep your head steady and blink your eyes naturally.',
    icon: <Eye className="w-5 h-5 text-blue-500" />,
  },
  {
    id: 'TURN_LEFT',
    title: 'Challenge 2 of 3: Head Rotation (YOUR LEFT)',
    instruction: 'Turn YOUR head to YOUR LEFT ←',
    personGuidance: 'Slowly turn your head towards your own left shoulder.',
    icon: <ArrowLeft className="w-5 h-5 text-amber-500" />,
  },
  {
    id: 'TURN_RIGHT',
    title: 'Challenge 3 of 3: Head Rotation (YOUR RIGHT)',
    instruction: 'Turn YOUR head to YOUR RIGHT →',
    personGuidance: 'Slowly turn your head towards your own right shoulder.',
    icon: <ArrowRight className="w-5 h-5 text-blue-500" />,
  },
];

export const LivenessChallenge: React.FC<LivenessChallengeProps> = ({
  onComplete,
  onRetry,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<{
    ear: number;
    yaw_deg: number;
    blink_count: number;
    face_detected: boolean;
    message: string;
  }>({
    ear: 0.28,
    yaw_deg: 0.0,
    blink_count: 0,
    face_detected: false,
    message: 'Position your face inside the frame...',
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const detectorRef = useRef<TemporalBlinkDetector>(new TemporalBlinkDetector());
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const challengeIndexRef = useRef<number>(0);

  challengeIndexRef.current = currentChallengeIndex;
  const activeChallenge = CHALLENGES[currentChallengeIndex] || CHALLENGES[0];

  const startCamera = async () => {
    try {
      setCameraError(null);
      detectorRef.current.reset();

      // Pre-load MediaPipe FaceLandmarker
      try {
        if (!landmarkerRef.current) {
          landmarkerRef.current = await getFaceLandmarker();
        }
      } catch (err) {
        console.warn('FaceLandmarker load warning:', err);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user' 
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }

      setIsCameraActive(true);
      setTimeLeft(30);
      isRunningRef.current = true;
    } catch (err: any) {
      console.warn('Camera access error:', err);
      let msg = 'Unable to access webcam. Please allow camera permissions in your browser and click Retry.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera access was denied. Please enable camera permission in your browser address bar.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No camera device found. Please connect a webcam.';
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    isRunningRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // 30s Countdown Timer
  useEffect(() => {
    if (!isCameraActive || isSuccess || isFailed) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsFailed(true);
          onComplete(false);
          stopCamera();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isCameraActive, isSuccess, isFailed]);

  // Real-Time Browser-Side Facial Landmark & Blink Inference Loop
  useEffect(() => {
    if (!isCameraActive || isSuccess || isFailed) return;

    let isSubscribed = true;

    const processLoop = (now: number) => {
      if (!isSubscribed || !isRunningRef.current) return;

      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      // Throttle inference to ~25-30 FPS (every 35ms)
      if (
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        landmarker &&
        now - lastInferenceTimeRef.current >= 35
      ) {
        lastInferenceTimeRef.current = now;

        try {
          const results = landmarker.detectForVideo(video, now);
          const currentCh = CHALLENGES[challengeIndexRef.current] || CHALLENGES[0];

          const { metrics, challengePassed, progressPct } = detectorRef.current.processFrame(
            results.faceLandmarks,
            currentCh.id,
            now
          );

          setTelemetry({
            ear: metrics.ear,
            yaw_deg: metrics.yawDeg,
            blink_count: metrics.blinkCount,
            face_detected: metrics.faceDetected,
            message: metrics.message,
          });

          setChallengeProgress(progressPct);

          if (challengePassed) {
            if (challengeIndexRef.current < CHALLENGES.length - 1) {
              const nextIndex = challengeIndexRef.current + 1;
              setCurrentChallengeIndex(nextIndex);
              setChallengeProgress(0);
            } else {
              setIsSuccess(true);
              stopCamera();
              onComplete(true);
              return;
            }
          }
        } catch (err) {
          // Continue frame loop
        }
      }

      if (isRunningRef.current) {
        animFrameIdRef.current = requestAnimationFrame(processLoop);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(processLoop);

    return () => {
      isSubscribed = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [isCameraActive, isSuccess, isFailed]);

  const handleRestart = () => {
    setIsSuccess(false);
    setIsFailed(false);
    setCurrentChallengeIndex(0);
    setChallengeProgress(0);
    setTimeLeft(30);
    detectorRef.current.reset();
    onRetry();
    startCamera();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Active Challenge Header Banner */}
      <div className={`p-4 rounded-xl border shadow-sm backdrop-blur-md transition-colors ${
        isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white shadow-slate-100'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {activeChallenge.icon}
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>
              {activeChallenge.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Time Left: <span className="font-semibold text-amber-500">{timeLeft}s</span>
            </span>
          </div>
        </div>

        {/* Primary User Instruction */}
        <div className={`p-3 rounded-lg border text-center ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={`text-sm md:text-base font-bold flex items-center justify-center gap-2 ${
            isDark ? 'text-slate-100' : 'text-slate-900'
          }`}>
            {activeChallenge.id === 'TURN_LEFT' && (
              <span className="text-lg text-amber-500 font-bold">←</span>
            )}
            {activeChallenge.instruction}
            {activeChallenge.id === 'TURN_RIGHT' && (
              <span className="text-lg text-blue-500 font-bold">→</span>
            )}
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {activeChallenge.personGuidance}
          </p>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
          <span
            className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md border ${
              telemetry.face_detected
                ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-300'
            }`}
          >
            {telemetry.face_detected ? 'FACE DETECTED ✓' : 'NO FACE'}
          </span>
          <span
            className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md border ${
              telemetry.face_detected
                ? isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'
                : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-300'
            }`}
          >
            {telemetry.face_detected ? 'EYES DETECTED ✓' : 'EYES PENDING'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className={`w-full h-2 rounded-full mt-3 overflow-hidden ${
          isDark ? 'bg-slate-800' : 'bg-slate-200'
        }`}>
          <div
            className="bg-blue-600 h-full transition-all duration-150 rounded-full"
            style={{ width: `${challengeProgress}%` }}
          />
        </div>
      </div>

      {/* Camera Live Feed Box */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3] flex items-center justify-center shadow-sm">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />

        {/* Target Reticle */}
        {isCameraActive && !isSuccess && !isFailed && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-64 md:w-56 md:h-72 rounded-[50%] border-2 border-dashed border-blue-400/60 flex flex-col items-center justify-between p-4">
              <div className="text-[10px] font-mono text-slate-300 uppercase tracking-widest bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
                Fit Face in Frame
              </div>

              {activeChallenge.id === 'TURN_LEFT' && (
                <div className="flex flex-col items-center text-amber-400 font-bold text-xs bg-slate-950/90 px-3 py-1.5 rounded-lg border border-amber-500/30">
                  <span className="text-base font-bold">←</span>
                  <span>Turn YOUR Left</span>
                </div>
              )}
              {activeChallenge.id === 'TURN_RIGHT' && (
                <div className="flex flex-col items-center text-blue-400 font-bold text-xs bg-slate-950/90 px-3 py-1.5 rounded-lg border border-blue-500/30">
                  <span className="text-base font-bold">→</span>
                  <span>Turn YOUR Right</span>
                </div>
              )}
              {activeChallenge.id === 'BLINK_TWICE' && (
                <div className="text-xs text-slate-200 font-semibold bg-slate-950/90 px-3 py-1 rounded-md border border-slate-800">
                  Blinks: {telemetry.blink_count}/2
                </div>
              )}

              <div className="text-[10px] text-slate-400 font-mono">
                EAR: {telemetry.ear.toFixed(2)} | Yaw: {telemetry.yaw_deg.toFixed(1)}°
              </div>
            </div>
          </div>
        )}

        {/* Camera Error */}
        {cameraError && !isCameraActive && (
          <div className="p-6 text-center space-y-4 max-w-md">
            <VideoOff className="w-12 h-12 text-rose-400 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-slate-200 mb-1">Webcam Inactive or Blocked</h4>
              <p className="text-xs text-slate-400">{cameraError}</p>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Grant Permission &amp; Retry
              </button>
            </div>
          </div>
        )}

        {/* Success Overlay */}
        {isSuccess && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Active Liveness Verified (100%)
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              All 3 biometric challenges (Blinks, Turn Left, Turn Right) verified. Proceeding to Biometric Face Match.
            </p>
          </div>
        )}

        {/* Failure Overlay WITH DIRECT CYBERCRIME ESCALATION */}
        {isFailed && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-200">
                LIVENESS VERIFICATION FAILED
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Liveness sequence was not completed within the time limit.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>REPORT TO CYBERCRIME</span>
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>RETRY LIVENESS</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Telemetry Status */}
      <div className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
        isDark ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-white text-slate-600 shadow-xs'
      }`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          <span>Liveness Telemetry Status:</span>
        </div>
        <div className={`font-mono text-[11px] truncate max-w-[280px] ${
          isDark ? 'text-slate-300' : 'text-slate-800'
        }`}>
          {telemetry.message}
        </div>
      </div>

      {isReportModalOpen && (
        <CybercrimeReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
};
