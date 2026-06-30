// ============================================================
//  gesture.js  —  fogmirror
//  MediaPipe HandLandmarker — index fingertip draws on mirror
//
//  gestures:
//    ☝️  index finger extended  →  pen DOWN (drawing)
//    ✊  fist / finger down     →  pen UP   (not drawing)
// ============================================================

import {
  HandLandmarker,
  FilesetResolver,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs';

// hand landmark indices
const INDEX_TIP  = 8;
const INDEX_PIP  = 6;   // knuckle
const MIDDLE_TIP = 12;
const MIDDLE_PIP = 10;
const RING_TIP   = 16;
const RING_PIP   = 14;

export class GestureTracker {
  /**
   * @param {HTMLCanvasElement} canvas  — the drawing canvas
   */
  constructor(canvas) {
    this.canvas     = canvas;
    this.ctx        = canvas.getContext('2d');
    this.landmarker = null;
    this._prev      = null;   // last drawn point
    this._drawing   = false;

    // style — can be changed from toolbar
    this.color = '#ffffff';
    this.size  = 8;

    // callbacks
    this.onDrawState = null;   // (isDrawing: bool) => void
    this.onReady     = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const img = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.putImageData(img, 0, 0);
    this._applyStyle();
  }

  _applyStyle() {
    this.ctx.lineCap     = 'round';
    this.ctx.lineJoin    = 'round';
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth   = this.size;
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
      runningMode:    'VIDEO',
      numHands:       1,
    });

    console.log('[gesture] landmarker ready');
    this.onReady?.();
  }

  /**
   * Call every animation frame.
   * @param {HTMLVideoElement} videoEl
   */
  detect(videoEl) {
    if (!this.landmarker || videoEl.readyState < 2) return;

    const now    = performance.now();
    const result = this.landmarker.detectForVideo(videoEl, now);

    if (!result.landmarks?.length) {
      // no hand detected — lift pen
      if (this._drawing) {
        this._drawing = false;
        this._prev    = null;
        this.onDrawState?.(false);
      }
      return;
    }

    const lm = result.landmarks[0];

    // ── gesture classification ─────────────────────────────
    const indexExtended  = lm[INDEX_TIP].y  < lm[INDEX_PIP].y;
    const middleExtended = lm[MIDDLE_TIP].y < lm[MIDDLE_PIP].y;
    const ringExtended   = lm[RING_TIP].y   < lm[RING_PIP].y;

    // draw only when index is up and middle/ring are down
    const penDown = indexExtended && !middleExtended && !ringExtended;

    // ── coordinate mapping ─────────────────────────────────
    // video is mirrored via CSS scaleX(-1), so flip x
    const tip = lm[INDEX_TIP];
    const x   = (1 - tip.x) * this.canvas.width;
    const y   = tip.y * this.canvas.height;

    if (penDown) {
      this._applyStyle();

      if (!this._drawing) {
        // start a new stroke — dot on first touch
        this._drawing = true;
        this.onDrawState?.(true);
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.size / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
        this._prev = { x, y };
      } else if (this._prev) {
        // continue stroke with smooth bezier
        const mid = {
          x: (this._prev.x + x) / 2,
          y: (this._prev.y + y) / 2,
        };
        this.ctx.beginPath();
        this.ctx.moveTo(this._prev.x, this._prev.y);
        this.ctx.quadraticCurveTo(this._prev.x, this._prev.y, mid.x, mid.y);
        this.ctx.stroke();
        this._prev = { x, y };
      }
    } else {
      // pen up
      if (this._drawing) {
        this._drawing = false;
        this._prev    = null;
        this.onDrawState?.(false);
      }
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setColor(hex) { this.color = hex; this._applyStyle(); }
  setSize(px)   { this.size  = Number(px); this._applyStyle(); }

  /**
   * Flatten video + fog + drawing into one PNG download.
   * @param {HTMLVideoElement} videoEl
   * @param {HTMLCanvasElement} fogCanvas
   */
  saveSnapshot(videoEl, fogCanvas) {
    const snap   = document.createElement('canvas');
    snap.width   = this.canvas.width;
    snap.height  = this.canvas.height;
    const sCtx   = snap.getContext('2d');

    sCtx.save();
    sCtx.translate(snap.width, 0);
    sCtx.scale(-1, 1);
    sCtx.drawImage(videoEl, 0, 0, snap.width, snap.height);
    sCtx.restore();

    sCtx.drawImage(fogCanvas, 0, 0);
    sCtx.drawImage(this.canvas, 0, 0);

    const link    = document.createElement('a');
    link.href     = snap.toDataURL('image/png');
    link.download = `fogmirror-${Date.now()}.png`;
    link.click();
  }
}
