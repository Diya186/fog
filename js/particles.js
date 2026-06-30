// ============================================================
//  particles.js  —  fogmirror
//  fog / smoke particle system on a canvas
// ============================================================

/** One fog puff */
class Particle {
  /**
   * @param {number} x  - spawn x
   * @param {number} w  - canvas width  (for drift bounds)
   * @param {number} h  - canvas height
   * @param {number} intensity - 0–1 breath strength
   */
  constructor(x, w, h, intensity = 0.5) {
    this.x     = x + (Math.random() - 0.5) * 80;
    this.y     = h * (0.5 + Math.random() * 0.5);   // start in lower half
    this.vx    = (Math.random() - 0.5) * 0.6;
    this.vy    = -(0.3 + Math.random() * 0.7 * intensity); // drift upward
    this.r     = 30  + Math.random() * 80 * intensity;
    this.maxR  = this.r * (1.8 + intensity);
    this.alpha = 0.25 + Math.random() * 0.25 * intensity;
    this.decay = 0.0015 + Math.random() * 0.002;
    this.grow  = 0.25 + Math.random() * 0.4;

    // slight hue shift: cool grey-blue fog
    const l = Math.floor(195 + Math.random() * 25);
    this.color = `rgb(${l},${l + 8},${l + 15})`;
  }

  update() {
    this.x      += this.vx;
    this.y      += this.vy;
    this.r       = Math.min(this.r + this.grow, this.maxR);
    this.alpha  -= this.decay;
    // gentle turbulence
    this.vx     += (Math.random() - 0.5) * 0.04;
    this.vy     += (Math.random() - 0.5) * 0.02;
  }

  get alive() { return this.alpha > 0; }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    grd.addColorStop(0,   `rgba(${this._rgb()},${(this.alpha * 0.9).toFixed(3)})`);
    grd.addColorStop(0.4, `rgba(${this._rgb()},${(this.alpha * 0.5).toFixed(3)})`);
    grd.addColorStop(1,   `rgba(${this._rgb()},0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  }

  _rgb() {
    // extract r,g,b from stored color string for alpha compositing
    return this.color.slice(4, -1); // "195,203,215"
  }
}

/** Manages all particles + canvas rendering */
export class FogSystem {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.particles = [];
    this._running  = false;
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /** Spawn a burst of particles from a breath event */
  breathe(intensity = 0.5) {
    // number of particles scales with intensity + some base
    const count = Math.floor(12 + intensity * 28);
    const cx    = this.canvas.width / 2;

    for (let i = 0; i < count; i++) {
      // spread across the bottom half, centered around middle
      const x = cx + (Math.random() - 0.5) * this.canvas.width * 0.7;
      this.particles.push(new Particle(x, this.canvas.width, this.canvas.height, intensity));
    }
  }

  /** Wipe: flood the canvas with dense fog then let it drift */
  wipe() {
    const count = 120;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.canvas.width;
      const p = new Particle(x, this.canvas.width, this.canvas.height, 0.9);
      p.y = Math.random() * this.canvas.height;  // scatter vertically too
      p.r = 60 + Math.random() * 120;
      p.alpha = 0.35 + Math.random() * 0.2;
      this.particles.push(p);
    }
  }

  /** Clear all particles */
  clear() {
    this.particles = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._loop();
  }

  stop() { this._running = false; }

  _loop() {
    if (!this._running) return;

    // don't fully clear — let particles blend naturally
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.globalCompositeOperation = 'source-over';

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      p.draw(this.ctx);
      if (!p.alive) this.particles.splice(i, 1);
    }

    requestAnimationFrame(() => this._loop());
  }
}
