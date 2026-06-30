// ============================================================
//  main.js  —  fogmirror
// ============================================================

import { initCamera }     from './camera.js';
import { FaceTracker }    from './face.js';
import { GestureTracker } from './gesture.js';
import { FogSystem }      from './particles.js';
import { VoiceCommands }  from './voice.js';

const splash      = document.getElementById('splash');
const stage       = document.getElementById('stage');
const startBtn    = document.getElementById('start-btn');
const videoEl     = document.getElementById('mirror-video');
const fogCanvas   = document.getElementById('fog-canvas');
const statusEl    = document.getElementById('status-mode');
const statusVoice = document.getElementById('status-voice');
const btnWipe     = document.getElementById('btn-wipe');
const btnClear    = document.getElementById('btn-clear');
const btnSave     = document.getElementById('btn-save');
const penSize     = document.getElementById('pen-size');

// fog system owns the mask canvas; gesture draws on that mask
const fog     = new FogSystem(fogCanvas);
const face    = new FaceTracker();
const gesture = new GestureTracker(fog.maskCanvas);  // ← key link

const voice   = new VoiceCommands({
  onWipe:   () => fog.wipe(),
  onClear:  () => fog.clearMask(),
  onStatus: (msg) => showVoiceStatus(msg),
});

// ── callbacks ──────────────────────────────────────────────

face.onMouthOpen = (intensity) => {
  fog.breathe(intensity);
  setStatus('😮 fogging...');
};

face.onMouthClose = () => setStatus('');

gesture.onDrawState = (isDrawing) => {
  setStatus(isDrawing ? '☝️ writing...' : '');
};

// ── toolbar ────────────────────────────────────────────────

btnWipe.addEventListener('click',  () => fog.wipe());
btnClear.addEventListener('click', () => fog.clearMask());
btnSave.addEventListener('click',  () => gesture.saveSnapshot(videoEl, fogCanvas));
penSize.addEventListener('input',  (e) => gesture.setSize(e.target.value));

// ── status ─────────────────────────────────────────────────

function showVoiceStatus(msg) {
  statusVoice.textContent = msg;
  statusVoice.classList.remove('voice-active');
  void statusVoice.offsetWidth;
  if (msg) statusVoice.classList.add('voice-active');
}

let _t = null;
function setStatus(msg) {
  statusEl.textContent = msg;
  clearTimeout(_t);
  if (msg) _t = setTimeout(() => (statusEl.textContent = ''), 2500);
}

// ── detection loop ─────────────────────────────────────────

function detectionLoop() {
  face.detect(videoEl);
  gesture.detect(videoEl);
  requestAnimationFrame(detectionLoop);
}

// ── startup ────────────────────────────────────────────────

startBtn.addEventListener('click', async () => {
  startBtn.textContent = '[ loading mediapipe... ]';
  startBtn.disabled    = true;

  try {
    await initCamera(videoEl);
    startBtn.textContent = '[ loading models... ]';
    await Promise.all([face.init(), gesture.init()]);

    voice.init();
    fog.start();

    splash.classList.add('hidden');
    stage.classList.remove('hidden');

    setTimeout(() => fog.wipe(), 200);
    detectionLoop();

  } catch (err) {
    console.error('[main] startup error:', err);
    startBtn.textContent = '[ failed — check console ]';
    startBtn.disabled    = false;
  }
});
