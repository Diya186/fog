// ============================================================
//  particles.js  —  fogmirror
//  fog particle system + finger-erase mask
// ============================================================

class Particle {
  constructor(x, y, w, h, intensity = 0.5) {
    this.x     = x + (Math.random() - 0.5) * 120;
    this.y     = y + (Math.random() - 0.5) * 120;
    this.vx    = (Math.random() - 0.5) * 0.5;
    this.vy    = -(0.1 + Math.random() * 0.4 * intensity);
    this.r     = 60  + Math.random() * 120 * intensity;
    this.maxR  = this.r * (1.5 + intensity * 0.8);
    this.alpha = 0.4 + Math.random() * 0.3 * intensity;
    this.decay = 0.0008 + Math.random() * 0.001;
    this.grow  = 0.3  + Math.random() * 0.5;
    const l    = Math.floor(190 + Math.random() * 30);
    this.r0    = l; this.g0 = l + 6; this.b0 = l + 14;
  }

  update() {
    this.x    += this.vx + (Math.random() - 0.5) * 0.06;
    this.y    += this.vy + (Math.random() - 0.5) * 0.04;
    this.r     = Math.min(this.r + this.grow, this.maxR);
    this.alpha -= this.decay;
  }

  get alive() { return this.alpha > 0; }

  draw(ctx) {
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    g.addColorStop(0,   `rgba(${this.r0},${this.g0},${this.b0},${(this.alpha * 0.95).toFixed(3)})`);
    g.addColorStop(0.45,`rgba(${this.r0},${this.g0},${this.b0},${(this.alpha * 0.55).toFixed(3)})`);
    g.addColorStop(1,   `rgba(${this.r0},${this.g0},${this.b0},0)`);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

export class FogSystem {
  constructor(canvas) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.particles = [];
    this._running  = false;

    // offscreen mask — finger strokes drawn here
    // each frame we punch holes in the fog using destination-out
    this.maskCanvas = document.createElement('canvas');
    this.maskCtx    = this.maskCanvas.getContext('2d');

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width  = w; this.canvas.height  = h;
    this.maskCanvas.width = w; this.maskCanvas.height = h;
  }

  /** Mouth open — aggressive full-screen fog burst */
  breathe(intensity = 0.5) {
    const w = this.canvas.width, h = this.canvas.height;
    // scatter particles across the ENTIRE screen
    const count = Math.floor(60 + intensity * 80);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      this.particles.push(new Particle(x, y, w, h, 0.7 + intensity * 0.3));
    }
  }

  /** Wipe: instantly flood everything, also clear finger traces */
  wipe() {
    this.clearMask();
    const w = this.canvas.width, h = this.canvas.height;
    const count = 200;
    for (let i = 0; i < count; i++) {
      const p = new Particle(
        Math.random() * w,
        Math.random() * h,
        w, h, 1.0
      );
      p.r     = 80  + Math.random() * 160;
      p.alpha = 0.5 + Math.random() * 0.25;
      p.decay = 0.0004;
      this.particles.push(p);
    }
  }

  /** Clear the finger-erase mask only (fog stays) */
  clearMask() {
    this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
  }

  /** Clear everything */
  clear() {
    this.particles = [];
    this.clearMask();
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

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'source-over';

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      p.draw(this.ctx);
      if (!p.alive) this.particles.splice(i, 1);
    }

    // punch holes where the finger has written
    if (this.maskCanvas) {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.drawImage(this.maskCanvas, 0, 0);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    requestAnimationFrame(() => this._loop());
  }
}
