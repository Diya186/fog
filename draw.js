// ============================================================
//  draw.js  —  fogmirror
//  smooth freehand drawing layer on top of the fog canvas
// ============================================================

export class DrawLayer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this._active = false;
    this._last   = null;

    // defaults — can be changed from toolbar
    this.color   = '#ffffff';
    this.size    = 6;

    this._resize();
    this._bindEvents();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    // preserve drawing across resize (by saving + restoring image data)
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

  _pos(e) {
    const rect = this.canvas.getBoundingClientRect();
    if (e.touches) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _startDraw(e) {
    e.preventDefault();
    this._active = true;
    this._last   = this._pos(e);
    this._applyStyle();
    // dot on click/tap
    this.ctx.beginPath();
    this.ctx.arc(this._last.x, this._last.y, this.size / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.color;
    this.ctx.fill();
  }

  _moveDraw(e) {
    if (!this._active) return;
    e.preventDefault();
    const cur = this._pos(e);

    // smooth quadratic bezier through midpoint
    const mid = {
      x: (this._last.x + cur.x) / 2,
      y: (this._last.y + cur.y) / 2,
    };

    this.ctx.beginPath();
    this.ctx.moveTo(this._last.x, this._last.y);
    this.ctx.quadraticCurveTo(this._last.x, this._last.y, mid.x, mid.y);
    this.ctx.stroke();

    this._last = cur;
  }

  _endDraw() {
    this._active = false;
    this._last   = null;
  }

  _bindEvents() {
    const c = this.canvas;

    // mouse
    c.addEventListener('mousedown',  e => this._startDraw(e));
    c.addEventListener('mousemove',  e => this._moveDraw(e));
    c.addEventListener('mouseup',    () => this._endDraw());
    c.addEventListener('mouseleave', () => this._endDraw());

    // touch
    c.addEventListener('touchstart', e => this._startDraw(e), { passive: false });
    c.addEventListener('touchmove',  e => this._moveDraw(e),  { passive: false });
    c.addEventListener('touchend',   () => this._endDraw());
  }

  /** Erase everything drawn */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setColor(hex) {
    this.color = hex;
    this._applyStyle();
  }

  setSize(px) {
    this.size = Number(px);
    this._applyStyle();
  }

  /**
   * Merge video + fog + drawing into one image and download it.
   * @param {HTMLVideoElement} videoEl
   * @param {HTMLCanvasElement} fogCanvas
   */
  saveSnapshot(videoEl, fogCanvas) {
    const snap   = document.createElement('canvas');
    snap.width   = this.canvas.width;
    snap.height  = this.canvas.height;
    const sCtx   = snap.getContext('2d');

    // 1. draw mirrored video
    sCtx.save();
    sCtx.translate(snap.width, 0);
    sCtx.scale(-1, 1);
    sCtx.drawImage(videoEl, 0, 0, snap.width, snap.height);
    sCtx.restore();

    // 2. fog layer
    sCtx.drawImage(fogCanvas, 0, 0);

    // 3. drawing layer
    sCtx.drawImage(this.canvas, 0, 0);

    // 4. download
    const link    = document.createElement('a');
    link.href     = snap.toDataURL('image/png');
    link.download = `fogmirror-${Date.now()}.png`;
    link.click();
  }
}
