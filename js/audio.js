// ============================================================
//  audio.js  —  fogmirror
//  microphone input + breath detection via Web Audio API
// ============================================================

const BREATH_THRESHOLD  = 0.18;   // 0–1 volume level that counts as a breath
const BREATH_COOLDOWN   = 600;    // ms between breath triggers
const SMOOTH_FACTOR     = 0.85;   // exponential smoothing (higher = smoother)

export class AudioAnalyser {
  constructor() {
    this.ctx         = null;
    this.analyser    = null;
    this.dataArray   = null;
    this.stream      = null;
    this.smoothed    = 0;
    this._lastBreath = 0;
    this._running    = false;

    // callbacks — set from outside
    this.onBreath    = null;   // () => void
    this.onVolume    = null;   // (level: 0–1) => void
  }

  /** Open the mic and start analysing */
  async init() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      console.error('[audio] mic permission denied:', err);
      throw err;
    }

    this.ctx      = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize            = 256;
    this.analyser.smoothingTimeConstant = 0.6;

    const source  = this.ctx.createMediaStreamSource(this.stream);
    source.connect(this.analyser);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this._running  = true;

    console.log('[audio] mic ready');
    this._tick();
  }

  /** Read volume every animation frame */
  _tick() {
    if (!this._running) return;

    this.analyser.getByteFrequencyData(this.dataArray);

    // RMS-style average across all frequency bins
    const sum = this.dataArray.reduce((acc, v) => acc + v, 0);
    const raw = sum / (this.dataArray.length * 255);

    // exponential smoothing so meter looks nice
    this.smoothed = SMOOTH_FACTOR * this.smoothed + (1 - SMOOTH_FACTOR) * raw;

    this.onVolume?.(this.smoothed);

    // breath trigger: raw spike above threshold + cooldown guard
    const now = performance.now();
    if (raw > BREATH_THRESHOLD && now - this._lastBreath > BREATH_COOLDOWN) {
      this._lastBreath = now;
      // intensity 0–1 gives particle system something to scale off
      const intensity = Math.min((raw - BREATH_THRESHOLD) / (1 - BREATH_THRESHOLD), 1);
      this.onBreath?.(intensity);
    }

    requestAnimationFrame(() => this._tick());
  }

  /** Clean up */
  destroy() {
    this._running = false;
    this.stream?.getTracks().forEach(t => t.stop());
    this.ctx?.close();
  }
}
