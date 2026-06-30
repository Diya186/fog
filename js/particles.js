// ============================================================
//  particles.js  —  fogmirror
// ============================================================

class Particle {
  constructor(x, y, intensity = 0.5) {
    this.x     = x + (Math.random() - 0.5) * 150;
    this.y     = y + (Math.random() - 0.5) * 150;
    this.vx    = (Math.random() - 0.5) * 0.4;
    this.vy    = -(0.05 + Math.random() * 0.25);
    this.r     = 90  + Math.random() * 160;
    this.maxR  = this.r * (1.6 + intensity * 0.6);
    // much lower alpha — wispy not solid
    this.alpha = 0.06 + Math.random() * 0.1 * intensity;
    this.decay = 0.0003 + Math.random() * 0.0004;
    this.grow  = 0.4 + Math.random() * 0.6;
    // cool blue-grey tint
    const l    = Math.floor(210 + Math.random() * 20);
    this.r0    = l - 8; this.g0 = l; this.b0 = l + 10;
  }

  update() {
    this.x    += this.vx + (Math.random() - 0.5) * 0.08;
    this.y    += this.vy;
    this.r     = Math.min(this.r + this.grow, this.maxR);
    this.alpha -= this.decay;
  }

  get alive() { return this.alpha > 0; }

  draw(ctx) {
    // very soft gradient — almost nothing at edges
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    g.addColorStop(0,    `rgba(${this.r0},${this.g0},${this.b0},${(this.alpha).toFixed(3)})`);
    g.addColorStop(0.35, `rgba(${this.r0},${this.g0},${this.b0},${(this.alpha * 0.5).toFixed(3)})`);
    g.addColorStop(0.7,  `rgba(${this.r0},${this.g0},${this.b0},${(this.alpha * 0.15).toFixed(3)})`);
    g.addColorStop(1,    `rgba(${this.r0},${this.g0},${this.b0},0)`);
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

  breathe(intensity = 0.5) {
    const w = this.canvas.width, h = this.canvas.height;
    // lots of particles but each is very transparent — layering creates the fog
    const count = Math.floor(80 + intensity * 120);
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(
        Math.random() * w,
        Math.random() * h,
        intensity
      ));
    }
  }

  wipe() {
    this.clearMask();
    const w = this.canvas.width, h = this.canvas.height;
    for (let i = 0; i < 250; i++) {
      const p = new Particle(Math.random() * w, Math.random() * h, 1.0);
      p.r     = 120 + Math.random() * 180;
      p.alpha = 0.08 + Math.random() * 0.1;
      p.decay = 0.0002;
      this.particles.push(p);
    }
  }

  clearMask() {
    this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
  }

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

    // punch holes where finger has written
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.drawImage(this.maskCanvas, 0, 0);
    this.ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(() => this._loop());
  }
}
