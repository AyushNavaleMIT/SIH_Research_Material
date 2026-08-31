import React, { useState, useEffect, useRef } from 'react';
import { Camera, Video } from 'lucide-react';
import type { FaceVerificationResult } from '../types';

interface WebcamCaptureProps {
  faceResult: FaceVerificationResult;
  activeLivenessStepPrompt?: string;
}

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  faceResult,
  activeLivenessStepPrompt,
}) => {
  const [cameraState, setCameraState] = useState<'GRANTED' | 'DENIED' | 'PROMPTING' | 'SIMULATED'>('SIMULATED');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Request actual camera stream if available, fallback gracefully to simulation
  const startCamera = async () => {
    try {
      setCameraState('PROMPTING');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraState('GRANTED');
    } catch (err) {
      console.warn('Camera access denied or unmounted, enabling synthetic stream simulation.');
      setCameraState('SIMULATED');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            Biometric Face Matching & Live Camera Sensor
          </h3>
          <p className="text-xs text-slate-400">
            Compare Document Portrait vs. Live Stream (68 Facial Vector Landmarks)
          </p>
        </div>

        {/* Camera permission indicator badge */}
        <div className="flex items-center space-x-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium border ${
              cameraState === 'GRANTED'
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                : cameraState === 'SIMULATED'
                ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800'
                : 'bg-amber-950/80 text-amber-400 border-amber-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
            CAMERA: {cameraState}
          </span>
        </div>
      </div>

      {/* Dual Video Grid: Document Face vs Live Stream */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Document Extracted Face */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col items-center justify-between text-center space-y-3">
          <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
            <span>SOURCE 1: DOCUMENT PORTRAIT</span>
            <span className="text-cyan-400">OCR CROP</span>
          </div>

          <div className="relative w-44 h-52 bg-slate-900 rounded-lg border-2 border-slate-700 overflow-hidden shadow-inner flex items-center justify-center">
            <img
              src={faceResult.documentFaceUrl}
              alt="Document Extracted Face"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border border-cyan-500/30 rounded pointer-events-none"></div>
            <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur text-[10px] font-mono text-cyan-300 py-0.5 rounded border border-cyan-800">
              Embedding ID: #8849-VEC
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Resolution: 600x600 px &bull; Vector Dimensions: 128D
          </div>
        </div>

        {/* Right Column: Live Camera Sensor Feed */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col items-center justify-between text-center space-y-3 relative overflow-hidden">
          <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2 z-10">
            <span className="flex items-center gap-1 text-slate-200">
              <Video className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              SOURCE 2: LIVE WEBCAM FEED
            </span>
            <span className="text-emerald-400 font-bold">LIVE STREAM</span>
          </div>

          {/* Video Container */}
          <div className="relative w-44 h-52 bg-slate-900 rounded-lg border-2 border-cyan-500/50 overflow-hidden shadow-2xl flex items-center justify-center">
            {cameraState === 'GRANTED' ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              // Synthetic Live Stream Video Fallback
              <img
                src={faceResult.liveCapturedFaceUrl}
                alt="Live Camera Stream Simulation"
                className="w-full h-full object-cover"
              />
            )}

            {/* Face Detection Bounding Oval Reticle */}
            <div className="absolute inset-2 border-2 border-dashed border-cyan-400/80 rounded-full animate-pulse pointer-events-none flex items-center justify-center">
              <div className="w-full h-[1px] bg-cyan-400/30"></div>
              <div className="h-full w-[1px] bg-cyan-400/30"></div>
            </div>

            {/* Live Indicator overlay badge */}
            <div className="absolute top-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[9px] font-mono text-emerald-400 border border-emerald-800">
              FACE DETECTED (68 PTS)
            </div>
          </div>

          {/* Active Prompt Info */}
          <div className="w-full bg-slate-900 p-2 rounded border border-slate-800 text-[11px] font-mono text-slate-300">
            {activeLivenessStepPrompt || 'Face aligned in reticle target zone'}
          </div>
        </div>
      </div>

      {/* Face Match Result Summary Card */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center font-mono font-bold text-lg border-2 ${
              faceResult.status === 'LOW'
                ? 'bg-emerald-950 text-emerald-400 border-emerald-500 shadow-lg shadow-emerald-950'
                : 'bg-rose-950 text-rose-400 border-rose-500 shadow-lg shadow-rose-950'
            }`}
          >
            {faceResult.similarityScore.toFixed(1)}%
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-slate-100">Biometric Match Similarity</h4>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  faceResult.status === 'LOW'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border-rose-800'
                }`}
              >
                {faceResult.status === 'LOW' ? 'VERIFIED MATCH' : 'MISMATCH WARNING'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Minimum similarity threshold: 75.0% &bull; Confidence: {faceResult.matchConfidence}%
            </p>
          </div>
        </div>

        {/* Micro metric breakdown */}
        <div className="flex items-center space-x-4 text-xs font-mono text-slate-300 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
          <div>
            <span className="block text-[10px] text-slate-500 uppercase">Landmarks</span>
            <span className="text-cyan-400 font-bold">68 / 68 Points</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 uppercase">Vector Dist</span>
            <span className="text-emerald-400 font-bold">0.12 (Low)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
