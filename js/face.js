// ============================================================
//  face.js  —  fogmirror
//  detects mouth open via MediaPipe FaceLandmarker
//  mouth open → triggers fog
// ============================================================

import {
  FaceLandmarker,
  FilesetResolver,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs';

// mouth inner landmarks (MediaPipe face mesh indices)
const UPPER_LIP = 13;
const LOWER_LIP = 14;
const CHIN      = 152;
const FOREHEAD  = 10;

const MOUTH_OPEN_RATIO = 0.055;  // mouth height / face height threshold
const MOUTH_COOLDOWN   = 500;    // ms between fog triggers

export class FaceTracker {
  constructor() {
    this.landmarker  = null;
    this._lastTrigger = 0;
    this._running    = false;
    this._mouthWasOpen = false;

    // callbacks
    this.onMouthOpen  = null;  // (intensity: 0–1) => void
    this.onMouthClose = null;  // () => void
    this.onReady      = null;  // () => void
  }

  async init() {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
    );

    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode:          'VIDEO',
      numFaces:             1,
      outputFaceBlendshapes: false,
    });

    console.log('[face] landmarker ready');
    this.onReady?.();
  }

  /**
   * Call this every animation frame with the video element.
   * @param {HTMLVideoElement} videoEl
   */
  detect(videoEl) {
    if (!this.landmarker || videoEl.readyState < 2) return;

    const now    = performance.now();
    const result = this.landmarker.detectForVideo(videoEl, now);

    if (!result.faceLandmarks?.length) return;

    const lm         = result.faceLandmarks[0];
    const upperLip   = lm[UPPER_LIP];
    const lowerLip   = lm[LOWER_LIP];
    const chin       = lm[CHIN];
    const forehead   = lm[FOREHEAD];

    const faceHeight  = Math.abs(chin.y - forehead.y);
    const mouthHeight = Math.abs(lowerLip.y - upperLip.y);
    const ratio       = faceHeight > 0 ? mouthHeight / faceHeight : 0;

    const isOpen = ratio > MOUTH_OPEN_RATIO;

    if (isOpen && !this._mouthWasOpen) {
      this._mouthWasOpen = true;
      if (now - this._lastTrigger > MOUTH_COOLDOWN) {
        this._lastTrigger = now;
        const intensity = Math.min((ratio - MOUTH_OPEN_RATIO) / 0.1, 1);
        this.onMouthOpen?.(intensity);
      }
    } else if (!isOpen && this._mouthWasOpen) {
      this._mouthWasOpen = false;
      this.onMouthClose?.();
    }
  }

  destroy() {
    this.landmarker?.close();
  }
}
