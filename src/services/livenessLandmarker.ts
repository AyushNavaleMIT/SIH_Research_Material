import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export interface LivenessMetrics {
  ear: number;
  leftEar: number;
  rightEar: number;
  baselineEar: number;
  yawDeg: number;
  pitchDeg: number;
  blinkCount: number;
  state: string;
  faceDetected: boolean;
  multipleFaces: boolean;
  message: string;
}

// MediaPipe Landmark Indices for Eye Aspect Ratio (EAR)
// Standard 6-point EAR calculation on 468 Dense Face Mesh
const LEFT_EYE_INDICES = {
  outerCorner: 33,
  innerCorner: 133,
  upper1: 160,
  upper2: 158,
  lower1: 144,
  lower2: 153,
};

const RIGHT_EYE_INDICES = {
  outerCorner: 263,
  innerCorner: 362,
  upper1: 385,
  upper2: 387,
  lower1: 380,
  lower2: 373,
};

// 3D Head Pose Landmark Indices
const NOSE_TIP = 1;
const LEFT_TEMPLE = 234;
const RIGHT_TEMPLE = 454;

function euclideanDist(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function computeEyeAspectRatio(
  landmarks: LandmarkPoint[],
  indices: typeof LEFT_EYE_INDICES
): number {
  try {
    const pOuter = landmarks[indices.outerCorner];
    const pInner = landmarks[indices.innerCorner];
    const pUp1 = landmarks[indices.upper1];
    const pUp2 = landmarks[indices.upper2];
    const pLow1 = landmarks[indices.lower1];
    const pLow2 = landmarks[indices.lower2];

    if (!pOuter || !pInner || !pUp1 || !pUp2 || !pLow1 || !pLow2) {
      return 0.28;
    }

    const horizontalDist = euclideanDist(pOuter, pInner);
    if (horizontalDist < 0.001) return 0.28;

    const verticalDist1 = euclideanDist(pUp1, pLow1);
    const verticalDist2 = euclideanDist(pUp2, pLow2);

    const ear = (verticalDist1 + verticalDist2) / (2.0 * horizontalDist);
    return Math.max(0.04, Math.min(0.50, ear));
  } catch {
    return 0.28;
  }
}

export function computeHeadPoseYaw(landmarks: LandmarkPoint[]): number {
  try {
    const nose = landmarks[NOSE_TIP];
    const leftTemple = landmarks[LEFT_TEMPLE];
    const rightTemple = landmarks[RIGHT_TEMPLE];

    if (!nose || !leftTemple || !rightTemple) return 0.0;

    const midTempleX = (leftTemple.x + rightTemple.x) / 2.0;
    const faceWidth = Math.abs(rightTemple.x - leftTemple.x);

    if (faceWidth < 0.01) return 0.0;

    // Person Perspective Yaw:
    // Mirror camera: when person turns to their own left, nose shifts left in mirrored canvas (positive yaw)
    const displacement = (midTempleX - nose.x) / (faceWidth * 0.5);
    const yawDeg = displacement * 38.0;

    return Math.max(-60.0, Math.min(60.0, yawDeg));
  } catch {
    return 0.0;
  }
}

export class TemporalBlinkDetector {
  private state: string = 'NO_FACE';
  private baselineEar: number = 0.28;
  private calibrationSamples: number[] = [];
  private isCalibrated: boolean = false;
  private blinkCount: number = 0;
  private closedStartTime: number = 0;
  private closedFrames: number = 0;
  private earHistory: number[] = [];
  private turnHoldStartTime: number = 0;

  public reset() {
    this.state = 'NO_FACE';
    this.baselineEar = 0.28;
    this.calibrationSamples = [];
    this.isCalibrated = false;
    this.blinkCount = 0;
    this.closedStartTime = 0;
    this.closedFrames = 0;
    this.earHistory = [];
    this.turnHoldStartTime = 0;
  }

  public getBlinkCount(): number {
    return this.blinkCount;
  }

  public processFrame(
    faceLandmarksList: LandmarkPoint[][],
    challenge: 'BLINK_TWICE' | 'TURN_LEFT' | 'TURN_RIGHT',
    timestampMs: number
  ): {
    metrics: LivenessMetrics;
    challengePassed: boolean;
    progressPct: number;
  } {
    // 1. Quality Gate: No face detected
    if (!faceLandmarksList || faceLandmarksList.length === 0) {
      this.state = 'NO_FACE';
      this.calibrationSamples = [];
      this.isCalibrated = false;
      this.closedFrames = 0;

      return {
        metrics: {
          ear: 0.28,
          leftEar: 0.28,
          rightEar: 0.28,
          baselineEar: this.baselineEar,
          yawDeg: 0.0,
          pitchDeg: 0.0,
          blinkCount: this.blinkCount,
          state: 'NO_FACE',
          faceDetected: false,
          multipleFaces: false,
          message: 'Position your face in the frame...',
        },
        challengePassed: false,
        progressPct: 0,
      };
    }

    // 2. Quality Gate: Multiple faces detected
    if (faceLandmarksList.length > 1) {
      return {
        metrics: {
          ear: 0.28,
          leftEar: 0.28,
          rightEar: 0.28,
          baselineEar: this.baselineEar,
          yawDeg: 0.0,
          pitchDeg: 0.0,
          blinkCount: this.blinkCount,
          state: 'MULTIPLE_FACES',
          faceDetected: true,
          multipleFaces: true,
          message: 'Multiple faces detected. Ensure only one person is in frame.',
        },
        challengePassed: false,
        progressPct: 0,
      };
    }

    const landmarks = faceLandmarksList[0];

    // Compute EAR independently for both eyes
    const leftEar = computeEyeAspectRatio(landmarks, LEFT_EYE_INDICES);
    const rightEar = computeEyeAspectRatio(landmarks, RIGHT_EYE_INDICES);
    const rawAvgEar = (leftEar + rightEar) / 2.0;

    // Smooth EAR over 3 frames to avoid single-frame camera sensor flicker
    this.earHistory.push(rawAvgEar);
    if (this.earHistory.length > 3) {
      this.earHistory.shift();
    }
    const ear = this.earHistory.reduce((a, b) => a + b, 0) / this.earHistory.length;

    // Compute Head Pose Yaw
    const yawDeg = computeHeadPoseYaw(landmarks);

    // 3. Adaptive Calibration: Establish open-eye baseline for this person
    if (!this.isCalibrated) {
      this.calibrationSamples.push(ear);
      if (this.calibrationSamples.length >= 6) {
        // Sort and take 75th percentile to represent natural open eyes
        const sorted = [...this.calibrationSamples].sort((a, b) => a - b);
        const p75 = sorted[Math.floor(sorted.length * 0.75)];
        this.baselineEar = Math.max(0.22, Math.min(0.40, p75));
        this.isCalibrated = true;
        this.state = 'EYES_OPEN';
      } else {
        this.state = 'FACE_STABILIZING';
        return {
          metrics: {
            ear: Math.round(ear * 100) / 100,
            leftEar: Math.round(leftEar * 100) / 100,
            rightEar: Math.round(rightEar * 100) / 100,
            baselineEar: Math.round(this.baselineEar * 100) / 100,
            yawDeg: Math.round(yawDeg * 10) / 10,
            pitchDeg: 0.0,
            blinkCount: this.blinkCount,
            state: 'FACE_STABILIZING',
            faceDetected: true,
            multipleFaces: false,
            message: 'Calibrating eye baseline... Keep looking at camera',
          },
          challengePassed: false,
          progressPct: (this.calibrationSamples.length / 6) * 20,
        };
      }
    }

    const b = this.baselineEar;
    const thOpen = b * 0.85;
    const thClosing = b * 0.70;
    const thClosed = Math.max(0.12, b * 0.52);
    const thReopen = b * 0.80;

    let challengePassed = false;
    let progressPct = 0;
    let message = '';

    // =========================================================================
    // Challenge 1: Temporal Natural Blink Detection
    // =========================================================================
    if (challenge === 'BLINK_TWICE') {
      if (this.state === 'EYES_OPEN' || this.state === 'FACE_STABILIZING') {
        if (ear <= thClosing || (leftEar <= thClosing && rightEar <= thClosing)) {
          this.state = 'EYES_CLOSING';
          this.closedStartTime = timestampMs;
          this.closedFrames = 1;
        } else {
          message = `Eyes open (${this.blinkCount}/2 blinks). Please blink naturally.`;
        }
      } else if (this.state === 'EYES_CLOSING') {
        if (ear <= thClosed || (leftEar <= thClosed && rightEar <= thClosed)) {
          this.state = 'EYES_CLOSED';
          this.closedFrames += 1;
        } else if (ear >= thOpen) {
          // Reopened without fully closing
          this.state = 'EYES_OPEN';
          this.closedFrames = 0;
        } else {
          this.closedFrames += 1;
        }
      } else if (this.state === 'EYES_CLOSED' || this.state === 'EYES_OPENING') {
        const closedDuration = timestampMs - this.closedStartTime;
        if (closedDuration > 2500) {
          this.state = 'STALLED_CLOSED';
          message = 'Please open your eyes to complete the blink.';
        } else if (ear >= thReopen || (leftEar >= thReopen && rightEar >= thReopen)) {
          // Valid Temporal Blink Cycle Completed: EYES_OPEN -> CLOSING -> CLOSED -> OPENING -> CONFIRMED
          if (this.closedFrames >= 1 && closedDuration >= 35 && closedDuration <= 2000) {
            this.blinkCount += 1;
            this.state = 'BLINK_CONFIRMED';
            this.closedFrames = 0;
            message = `Blink ${this.blinkCount} of 2 verified!`;
            if (this.blinkCount >= 2) {
              challengePassed = true;
            }
          } else {
            this.state = 'EYES_OPEN';
            this.closedFrames = 0;
          }
        } else if (ear >= thClosing || leftEar >= thClosing || rightEar >= thClosing) {
          this.state = 'EYES_OPENING';
        } else {
          this.closedFrames += 1;
        }
      } else if (this.state === 'BLINK_CONFIRMED') {
        this.state = 'EYES_OPEN';
        message = `Blink verified (${this.blinkCount}/2).`;
        if (this.blinkCount >= 2) {
          challengePassed = true;
        }
      } else if (this.state === 'STALLED_CLOSED') {
        if (ear >= thReopen) {
          this.state = 'EYES_OPEN';
          this.closedFrames = 0;
          message = 'Eyes reopened. Please blink naturally.';
        } else {
          message = 'Please open your eyes.';
        }
      }

      progressPct = Math.min(100, (this.blinkCount / 2) * 100);
      if (this.blinkCount >= 2) {
        challengePassed = true;
        message = 'Natural blinks verified! (2/2 completed)';
      }
    }

    // =========================================================================
    // Challenge 2: Head Turn Left (Person's perspective: >= +12.0°)
    // =========================================================================
    else if (challenge === 'TURN_LEFT') {
      if (yawDeg >= 12.0) {
        if (this.turnHoldStartTime === 0) {
          this.turnHoldStartTime = timestampMs;
        }
        const holdDuration = timestampMs - this.turnHoldStartTime;
        progressPct = Math.min(100, (holdDuration / 300) * 100);
        if (holdDuration >= 300) {
          challengePassed = true;
          message = `Turn Left verified! (Yaw: +${yawDeg.toFixed(1)}°)`;
        } else {
          message = 'Hold position to YOUR left...';
        }
      } else {
        this.turnHoldStartTime = 0;
        progressPct = Math.max(0, (yawDeg / 12.0) * 50);
        message = `Turn your head to YOUR LEFT ← (Current: ${yawDeg.toFixed(1)}°)`;
      }
    }

    // =========================================================================
    // Challenge 3: Head Turn Right (Person's perspective: <= -12.0°)
    // =========================================================================
    else if (challenge === 'TURN_RIGHT') {
      if (yawDeg <= -12.0) {
        if (this.turnHoldStartTime === 0) {
          this.turnHoldStartTime = timestampMs;
        }
        const holdDuration = timestampMs - this.turnHoldStartTime;
        progressPct = Math.min(100, (holdDuration / 300) * 100);
        if (holdDuration >= 300) {
          challengePassed = true;
          message = `Turn Right verified! (Yaw: ${yawDeg.toFixed(1)}°)`;
        } else {
          message = 'Hold position to YOUR right...';
        }
      } else {
        this.turnHoldStartTime = 0;
        progressPct = Math.max(0, (Math.abs(yawDeg) / 12.0) * 50);
        message = `Turn your head to YOUR RIGHT → (Current: ${yawDeg.toFixed(1)}°)`;
      }
    }

    return {
      metrics: {
        ear: Math.round(ear * 100) / 100,
        leftEar: Math.round(leftEar * 100) / 100,
        rightEar: Math.round(rightEar * 100) / 100,
        baselineEar: Math.round(this.baselineEar * 100) / 100,
        yawDeg: Math.round(yawDeg * 10) / 10,
        pitchDeg: 0.0,
        blinkCount: this.blinkCount,
        state: this.state,
        faceDetected: true,
        multipleFaces: false,
        message: message || `State: ${this.state}`,
      },
      challengePassed,
      progressPct: Math.round(progressPct),
    };
  }
}

let cachedLandmarker: FaceLandmarker | null = null;
let landmarkerInitPromise: Promise<FaceLandmarker> | null = null;

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (cachedLandmarker) {
    return cachedLandmarker;
  }

  if (landmarkerInitPromise) {
    return landmarkerInitPromise;
  }

  landmarkerInitPromise = (async () => {
    // Attempt local WASM first, with fallback to Google CDN
    let filesetResolver;
    try {
      filesetResolver = await FilesetResolver.forVisionTasks('/wasm');
    } catch {
      filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
    }

    // Attempt local model asset first, with fallback to Google Cloud Storage
    let landmarker: FaceLandmarker;
    try {
      landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: '/models/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 2,
        minFaceDetectionConfidence: 0.45,
        minFacePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    } catch {
      landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numFaces: 2,
        minFaceDetectionConfidence: 0.45,
        minFacePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    }

    cachedLandmarker = landmarker;
    return landmarker;
  })();

  return landmarkerInitPromise;
}
