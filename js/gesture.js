// ============================================================
//  gesture.js  —  fogmirror
//  finger erases fog — smoothed + min distance threshold
// ============================================================

import {
  HandLandmarker,
  FilesetResolver,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs';

const INDEX_TIP  = 8;
const INDEX_PIP  = 6;
const MIDDLE_TIP = 12;
const MIDDLE_PIP = 10;
const RING_TIP   = 16;
const RING_PIP   = 14;

const SMOOTH      = 0.5;   // EMA smoothing (0=no smooth, 1=frozen)
const MIN_DIST    = 6;     // px — ignore micro jitter below this

export class GestureTracker {
  constructor(maskCanvas) {
    this.maskCanvas = maskCanvas;
    this.maskCtx    = maskCanvas.getContext('2d');
    this.landmarker = null;
    this._prev      = null;
    this._smoothed  = null;   // EMA position
    this._drawing   = false;
    this.size       = 28;

    this.onDrawState = null;
    this.onReady     = null;
  }

  async init() {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
    );

    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands:    1,
    });

    console.log('[gesture] ready');
    this.onReady?.();
  }

  detect(videoEl) {
    if (!this.landmarker || videoEl.readyState < 2) return;

    const result = this.landmarker.detectForVideo(videoEl, performance.now());

    if (!result.landmarks?.length) {
      if (this._drawing) {
        this._drawing  = false;
        this._prev     = null;
        this._smoothed = null;
        this.onDrawState?.(false);
      }
      return;
    }

    const lm = result.landmarks[0];

    const indexExtended  = lm[INDEX_TIP].y  < lm[INDEX_PIP].y;
    const middleExtended = lm[MIDDLE_TIP].y < lm[MIDDLE_PIP].y;
    const ringExtended   = lm[RING_TIP].y   < lm[RING_PIP].y;
    const penDown        = indexExtended && !middleExtended && !ringExtended;

    // raw position (mirrored x)
    const tip  = lm[INDEX_TIP];
    const rawX = (1 - tip.x) * this.maskCanvas.width;
    const rawY = tip.y * this.maskCanvas.height;

    // EMA smoothing — kills jitter
    if (!this._smoothed) {
      this._smoothed = { x: rawX, y: rawY };
    } else {
      this._smoothed.x = SMOOTH * this._smoothed.x + (1 - SMOOTH) * rawX;
      this._smoothed.y = SMOOTH * this._smoothed.y + (1 - SMOOTH) * rawY;
    }

    const { x, y } = this._smoothed;

    if (penDown) {
      this.maskCtx.globalCompositeOperation = 'source-over';
      this.maskCtx.lineCap     = 'round';
      this.maskCtx.lineJoin    = 'round';
      this.maskCtx.strokeStyle = 'rgba(0,0,0,1)';
      this.maskCtx.lineWidth   = this.size;

      if (!this._drawing) {
        this._drawing = true;
        this.onDrawState?.(true);
        // first dot
        this.maskCtx.beginPath();
        this.maskCtx.arc(x, y, this.size / 2, 0, Math.PI * 2);
        this.maskCtx.fillStyle = 'rgba(0,0,0,1)';
        this.maskCtx.fill();
        this._prev = { x, y };

      } else if (this._prev) {
        // minimum distance check — don't draw tiny jitter segments
        const dx   = x - this._prev.x;
        const dy   = y - this._prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > MIN_DIST) {
          const mid = { x: (this._prev.x + x) / 2, y: (this._prev.y + y) / 2 };
          this.maskCtx.beginPath();
          this.maskCtx.moveTo(this._prev.x, this._prev.y);
          this.maskCtx.quadraticCurveTo(this._prev.x, this._prev.y, mid.x, mid.y);
          this.maskCtx.stroke();
          this._prev = { x, y };
        }
      }

    } else {
      if (this._drawing) {
        this._drawing  = false;
        this._prev     = null;
        this.onDrawState?.(false);
      }
    }
  }

  setSize(px) { this.size = Number(px); }

  saveSnapshot(videoEl, fogCanvas) {
    const snap  = document.createElement('canvas');
    snap.width  = fogCanvas.width;
    snap.height = fogCanvas.height;
    const sCtx  = snap.getContext('2d');
    sCtx.save();
    sCtx.translate(snap.width, 0);
    sCtx.scale(-1, 1);
    sCtx.drawImage(videoEl, 0, 0, snap.width, snap.height);
    sCtx.restore();
    sCtx.drawImage(fogCanvas, 0, 0);
    const link    = document.createElement('a');
    link.href     = snap.toDataURL('image/png');
    link.download = `fogmirror-${Date.now()}.png`;
    link.click();
  }
}
