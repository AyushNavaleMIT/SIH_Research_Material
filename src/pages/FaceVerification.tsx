import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  UserCheck, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Loader2, 
  VideoOff, 
  Sparkles, 
  Info, 
  XCircle, 
  ShieldAlert,
  FileImage
} from 'lucide-react';
import type { FaceVerificationResult, DocumentAnalysisResult } from '../types';
import { ScreeningApiService } from '../services/api';
import { CybercrimeReportModal } from '../components/CybercrimeReportModal';
import { useTheme } from '../context/ThemeContext';

interface FaceVerificationProps {
  docResult: DocumentAnalysisResult;
  currentFaceResult?: FaceVerificationResult;
  onVerificationComplete: (result: FaceVerificationResult) => void;
  onProceedToLiveness?: () => void;
}

type CameraStatus = 'OFF' | 'STARTING' | 'READY' | 'ERROR';

export const FaceVerification: React.FC<FaceVerificationProps> = ({
  docResult,
  currentFaceResult,
  onVerificationComplete,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('STARTING');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedSelfieUrl, setCapturedSelfieUrl] = useState<string | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef<boolean>(true);

  // Stop camera tracks cleanly
  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (e) {}
    }
    if (isMountedRef.current) {
      setCameraStatus('OFF');
    }
  }, []);

  // Start webcam with robust event handling, explicit track validation, and retry logic
  const startWebcam = useCallback(async (retryCount = 0) => {
    // Teardown previous stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setErrorMessage(null);
    setCameraError(null);
    setCameraStatus('STARTING');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API (navigator.mediaDevices.getUserMedia) is not supported in this browser environment.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;

        const checkReadinessAndPlay = async () => {
          try {
            await video.play();
          } catch (playErr: any) {
            console.warn('Video play note:', playErr);
          }

          if (isMountedRef.current) {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              setCameraStatus('READY');
            } else {
              // Wait for dimensions to populate
              video.onplaying = () => {
                if (isMountedRef.current) setCameraStatus('READY');
              };
              video.oncanplay = () => {
                if (isMountedRef.current) setCameraStatus('READY');
              };
            }
          }
        };

        if (video.readyState >= 2 && video.videoWidth > 0) {
          checkReadinessAndPlay();
        } else {
          video.onloadedmetadata = () => {
            checkReadinessAndPlay();
          };
          video.oncanplay = () => {
            checkReadinessAndPlay();
          };

          // Safe fallback timer if metadata event was already missed
          setTimeout(() => {
            if (isMountedRef.current && streamRef.current && video.srcObject) {
              checkReadinessAndPlay();
            }
          }, 350);
        }
      }
    } catch (err: any) {
      console.error('Webcam initialization error in Face Match:', err);

      // Handle transient busy state from Step 2 Liveness with 1 automatic retry
      if ((err.name === 'NotReadableError' || err.name === 'TrackStartError') && retryCount < 2) {
        setTimeout(() => {
          if (isMountedRef.current) {
            startWebcam(retryCount + 1);
          }
        }, 400);
        return;
      }

      let userFriendlyMsg = 'Could not open camera stream. Please check camera permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        userFriendlyMsg = 'Camera permission was denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        userFriendlyMsg = 'No webcam device found. Please connect a camera or upload a selfie image below.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        userFriendlyMsg = 'Camera is currently locked by another application or browser tab. Please close other camera tabs and retry.';
      } else if (err.name === 'OverconstrainedError') {
        userFriendlyMsg = 'Camera constraints could not be satisfied by your video device.';
      } else if (err.name === 'SecurityError') {
        userFriendlyMsg = 'Camera access requires a secure origin (localhost or HTTPS).';
      }

      if (isMountedRef.current) {
        setCameraError(userFriendlyMsg);
        setCameraStatus('ERROR');
      }
    }
  }, []);

  // Automatic Lifecycle: Start camera automatically when Step 3 Face Match mounts
  useEffect(() => {
    isMountedRef.current = true;

    // Small 60ms delay ensures previous stage media tracks are fully released by browser
    const timer = setTimeout(() => {
      startWebcam();
    }, 60);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      stopWebcam();
    };
  }, [startWebcam, stopWebcam]);

  // Capture live snapshot from webcam canvas
  const captureWebcamSnapshot = () => {
    const video = videoRef.current;
    if (!video || cameraStatus !== 'READY') return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Un-mirror image before sending to facial recognition
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            setSelfieBlob(blob);
            const previewUrl = URL.createObjectURL(blob);
            setCapturedSelfieUrl(previewUrl);
            stopWebcam();
            runFaceVerification(blob);
          }
        },
        'image/jpeg',
        0.92
      );
    } catch (e: any) {
      console.error('Snapshot capture error:', e);
      setErrorMessage('Failed to capture frame from webcam.');
    }
  };

  // Extract a keyframe from video files (mp4, webm, quicktime)
  const extractKeyframeFromVideo = (videoFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.muted = true;
      videoEl.playsInline = true;
      const videoUrl = URL.createObjectURL(videoFile);
      videoEl.src = videoUrl;

      videoEl.onloadeddata = () => {
        videoEl.currentTime = Math.min(0.5, (videoEl.duration || 1) / 2);
      };

      videoEl.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = videoEl.videoWidth || 640;
          canvas.height = videoEl.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(videoUrl);
            return reject(new Error('Could not create canvas context for video keyframe.'));
          }
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(videoUrl);
              if (blob) resolve(blob);
              else reject(new Error('Failed to encode keyframe blob.'));
            },
            'image/jpeg',
            0.92
          );
        } catch (err) {
          URL.revokeObjectURL(videoUrl);
          reject(err);
        }
      };

      videoEl.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Failed to load video file for keyframe extraction.'));
      };
    });
  };

  // Handle uploaded media file (images or short video files)
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setErrorMessage(null);

      // Validate file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        setErrorMessage('File size exceeds maximum limit of 25MB. Please upload a smaller file.');
        return;
      }

      const fileType = file.type.toLowerCase();
      const isImage = fileType.startsWith('image/');
      const isVideo = fileType.startsWith('video/');

      if (!isImage && !isVideo) {
        setErrorMessage('Unsupported file format. Please upload a JPEG, PNG, WEBP image or MP4/WEBM video.');
        return;
      }

      try {
        let finalBlob: Blob;
        let previewUrl: string;

        if (isVideo) {
          setIsVerifying(true);
          finalBlob = await extractKeyframeFromVideo(file);
          previewUrl = URL.createObjectURL(finalBlob);
        } else {
          finalBlob = file;
          previewUrl = URL.createObjectURL(file);
        }

        setSelfieBlob(finalBlob);
        setCapturedSelfieUrl(previewUrl);
        stopWebcam();
        runFaceVerification(finalBlob);
      } catch (err: any) {
        console.error('Media upload processing error:', err);
        setErrorMessage(err.message || 'Failed to process uploaded media.');
      } finally {
        // Reset file input value so the same file can be chosen again if retried
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  // Execute Face Verification API
  const runFaceVerification = async (selfieFileBlob: Blob) => {
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      let docBlob: Blob;
      if (docResult.imageUrl) {
        const res = await fetch(docResult.imageUrl);
        docBlob = await res.blob();
      } else {
        throw new Error('No reference document image available from Step 1 for face comparison.');
      }

      const result = await ScreeningApiService.verifyFaceMatch(docBlob, selfieFileBlob);
      onVerificationComplete(result);

      if (result.status === 'FAILED') {
        if (result.errorCode === 'NO_SELFIE_FACE') {
          setErrorMessage('Face not detected in the submitted image. Please upload or capture a clear front-facing photo.');
        } else if (result.errorCode === 'MULTIPLE_SELFIE_FACES') {
          setErrorMessage('Multiple faces detected in the image. Please upload an image containing only the applicant.');
        } else if (result.similarityScore !== undefined && result.similarityScore < 70.0) {
          setErrorMessage(`Biometric mismatch: Facial similarity is ${result.similarityScore.toFixed(1)}% (below required 70.0% match threshold).`);
        }
      }
    } catch (err: any) {
      console.error('Face verification API error:', err);
      setErrorMessage(err.message || 'Face match calculation failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedSelfieUrl(null);
    setSelfieBlob(null);
    setErrorMessage(null);
    startWebcam();
  };

  const isVerified = currentFaceResult?.status === 'PASSED';
  const isMismatch = currentFaceResult?.status === 'FAILED' && !!capturedSelfieUrl && !isVerifying;

  return (
    <div className="space-y-6">
      {/* 1. SECTION HEADER */}
      <div className={`p-5 rounded-2xl border shadow-sm backdrop-blur-md transition-colors ${
        isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white shadow-slate-100'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                1:1 Biometric Face Match
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Compare live applicant facial geometry against the ID portrait.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {currentFaceResult && (
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                  isVerified
                    ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {isVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>{currentFaceResult.status} ({currentFaceResult.similarityScore}%)</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. DUAL-COLUMN COMPARISON CANVAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Document Portrait */}
        <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
          isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white shadow-slate-100'
        }`}>
          <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              1. Document Reference Photo
            </h3>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              {docResult.documentType || 'ID Document'}
            </span>
          </div>

          <div className={`relative aspect-4/3 rounded-xl border overflow-hidden flex items-center justify-center ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            {docResult.imageUrl ? (
              <img
                src={docResult.imageUrl}
                alt="Extracted Document Portrait"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className={`p-6 text-center space-y-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Info className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-xs">No document image loaded from Step 1.</p>
              </div>
            )}
          </div>

          <div className={`text-xs space-y-1.5 p-3 rounded-lg border ${
            isDark ? 'bg-slate-950/60 border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <div className="flex justify-between">
              <span>Source File:</span>
              <span className={`font-mono truncate max-w-[180px] ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                {docResult.fileName || 'doc.jpg'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Name on Document:</span>
              <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                {docResult.ocr?.fields?.name || 'XYZ'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: Live Applicant Selfie / Media Upload */}
        <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
          isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white shadow-slate-100'
        }`}>
          <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              2. Live Applicant Capture
            </h3>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {cameraStatus === 'READY'
                  ? 'LIVE FEED'
                  : cameraStatus === 'STARTING'
                  ? 'STARTING...'
                  : capturedSelfieUrl
                  ? 'CAPTURED'
                  : cameraStatus === 'ERROR'
                  ? 'CAMERA ERROR'
                  : 'STANDBY'}
              </span>

              {/* Upload Media Button in Header */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-md border flex items-center gap-1 cursor-pointer transition-colors ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                }`}
                title="Upload Photo or Video instead of Live Camera"
              >
                <Upload className="w-3 h-3 text-blue-500" />
                <span>Upload Media</span>
              </button>
            </div>
          </div>

          {/* Interactive Camera & Preview Canvas */}
          <div className={`relative aspect-4/3 rounded-xl border overflow-hidden flex items-center justify-center ${
            isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            {/* Single Persistent Video Element (Always present in DOM to maintain stream binding) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] ${
                !capturedSelfieUrl && cameraStatus === 'READY' ? 'block' : 'hidden'
              }`}
            />

            {/* Target Face Oval Reticle when Live Video is Active */}
            {!capturedSelfieUrl && cameraStatus === 'READY' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-40 h-52 md:w-48 md:h-60 rounded-[50%] border-2 border-dashed border-blue-500/70 flex items-center justify-center">
                  <span className="text-[10px] font-mono text-blue-500 uppercase tracking-wider bg-slate-950/80 px-2 py-0.5 rounded border border-blue-500/30">
                    Center Face Here
                  </span>
                </div>
              </div>
            )}

            {/* Snapshot Action Button when Live Video is Active */}
            {!capturedSelfieUrl && cameraStatus === 'READY' && (
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={captureWebcamSnapshot}
                  className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xl cursor-pointer transition-all duration-150"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Snapshot &amp; Verify</span>
                </button>
              </div>
            )}

            {/* Starting Camera Spinner Overlay */}
            {!capturedSelfieUrl && cameraStatus === 'STARTING' && (
              <div className="p-6 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                <div>
                  <h4 className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Starting Live Camera...
                  </h4>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Connecting video feed for 1:1 facial biometric matching.
                  </p>
                </div>
              </div>
            )}

            {/* Captured Selfie / Uploaded Media Preview */}
            {capturedSelfieUrl && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={capturedSelfieUrl}
                  alt="Captured Applicant Selfie"
                  className="w-full h-full object-contain"
                />
                {isVerifying && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-blue-300 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    <span>Comparing 128D Facial Geometry...</span>
                  </div>
                )}
              </div>
            )}

            {/* Camera Error or Off View */}
            {!capturedSelfieUrl && (cameraStatus === 'ERROR' || cameraStatus === 'OFF') && (
              <div className="p-6 text-center space-y-3 max-w-sm">
                <VideoOff className="w-10 h-10 text-rose-500 mx-auto" />
                <div className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {cameraStatus === 'ERROR' ? 'Camera Unavailable' : 'Camera Disconnected'}
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {cameraError || 'Use live camera or upload a clear photo/video for 1:1 facial verification.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => startWebcam()}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`px-3.5 py-1.5 rounded-lg font-bold text-xs border flex items-center justify-center gap-1.5 cursor-pointer ${
                      isDark 
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-500" /> Upload Media
                  </button>
                </div>
              </div>
            )}

            {/* Hidden File Input for Media Upload (Images & Videos) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg,video/mp4,video/webm,video/quicktime"
              onChange={handleMediaUpload}
              className="hidden"
            />
          </div>

          {/* Action Row Under Selfie View */}
          <div className="flex items-center justify-between pt-1">
            {capturedSelfieUrl ? (
              <div className="flex items-center justify-between w-full">
                <button
                  type="button"
                  onClick={handleRetakePhoto}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retake / Restart Camera
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => selfieBlob && runFaceVerification(selfieBlob)}
                    disabled={isVerifying}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Re-verify</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Media
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <FileImage className="w-3.5 h-3.5 text-blue-500" />
                  <span>Supports Live Webcam or JPEG / PNG / WEBP / MP4 files</span>
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Selfie File
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
          isDark ? 'bg-rose-950/30 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* LOCALIZED BIOMETRIC MISMATCH & CYBERCRIME ESCALATION */}
      {isMismatch && (
        <div className={`p-5 rounded-2xl border shadow-lg space-y-4 ${
          isDark ? 'bg-rose-950/30 border-rose-500/50' : 'bg-rose-50 border-rose-300'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                isDark ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-rose-100 border-rose-200 text-rose-600'
              }`}>
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wide flex items-center gap-2 ${
                  isDark ? 'text-rose-200' : 'text-rose-900'
                }`}>
                  <span>BIOMETRIC IDENTITY MISMATCH</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-200'
                  }`}>
                    SIMILARITY: {currentFaceResult?.similarityScore}% (Below 70.0% threshold)
                  </span>
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  The live facial feature vectors do not match the extracted document portrait.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>REPORT TO CYBERCRIME</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cybercrime Modal */}
      {isReportModalOpen && (
        <CybercrimeReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          faceResult={currentFaceResult}
        />
      )}
    </div>
  );
};

export const FaceVerificationPage: React.FC<any> = () => {
  return <div className="p-4 text-xs text-slate-400">Please access Face Verification via the Unified Workflow 5-Step Pipeline.</div>;
};
