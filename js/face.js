// ============================================================
//  face.js  —  fogmirror
//  mouth open → continuous fog while held open
// ============================================================

import {
  FaceLandmarker,
  FilesetResolver,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs';

const UPPER_LIP      = 13;
const LOWER_LIP      = 14;
const CHIN           = 152;
const FOREHEAD       = 10;
const MOUTH_OPEN_RATIO = 0.02;   // trigger threshold
const SPAWN_INTERVAL   = 120;    // ms between smoke spawns while mouth held open

export class FaceTracker {
  constructor() {
    this.landmarker      = null;
    this._mouthOpen      = false;
    this._lastSpawn      = 0;

    this.onMouthOpen     = null;   // (intensity) => void  — fires continuously while open
    this.onMouthClose    = null;
    this.onReady         = null;
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
      runningMode:           'VIDEO',
      numFaces:              1,
      outputFaceBlendshapes: false,
    });

    console.log('[face] ready');
    this.onReady?.();
  }

  detect(videoEl) {
    if (!this.landmarker || videoEl.readyState < 2) return;

    const now    = performance.now();
    const result = this.landmarker.detectForVideo(videoEl, now);

    if (!result.faceLandmarks?.length) return;

    const lm         = result.faceLandmarks[0];
    const faceHeight  = Math.abs(lm[CHIN].y - lm[FOREHEAD].y);
    const mouthHeight = Math.abs(lm[LOWER_LIP].y - lm[UPPER_LIP].y);
    const ratio       = faceHeight > 0 ? mouthHeight / faceHeight : 0;
    const isOpen      = ratio > MOUTH_OPEN_RATIO;

    if (isOpen) {
      const intensity = Math.min((ratio - MOUTH_OPEN_RATIO) / 0.08, 1);

      if (!this._mouthOpen) {
        this._mouthOpen = true;
        // immediate first spawn
        this.onMouthOpen?.(intensity);
        this._lastSpawn = now;
      } else {
        // keep spawning while mouth stays open, throttled by SPAWN_INTERVAL
        if (now - this._lastSpawn > SPAWN_INTERVAL) {
          this._lastSpawn = now;
          this.onMouthOpen?.(intensity);
        }
      }
    } else {
      if (this._mouthOpen) {
        this._mouthOpen = false;
        this.onMouthClose?.();
      }
    }
  }

  destroy() { this.landmarker?.close(); }
}
