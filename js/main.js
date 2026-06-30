// ============================================================
//  main.js  —  fogmirror
//  entry point: camera + face (mouth→fog) + gesture (finger→draw)
// ============================================================

import { initCamera }     from './camera.js';
import { FaceTracker }    from './face.js';
import { GestureTracker } from './gesture.js';
import { FogSystem }      from './particles.js';
import { VoiceCommands }  from './voice.js';

// ── element refs ──────────────────────────────────────────

const splash     = document.getElementById('splash');
const stage      = document.getElementById('stage');
const startBtn   = document.getElementById('start-btn');
const videoEl    = document.getElementById('mirror-video');
const fogCanvas  = document.getElementById('fog-canvas');
const drawCanvas = document.getElementById('draw-canvas');
const statusEl   = document.getElementById('status-mode');
const statusVoice= document.getElementById('status-voice');
const btnWipe    = document.getElementById('btn-wipe');
const btnClear   = document.getElementById('btn-clear');
const btnSave    = document.getElementById('btn-save');
const penColor   = document.getElementById('pen-color');
const penSize    = document.getElementById('pen-size');

// ── modules ───────────────────────────────────────────────

const fog     = new FogSystem(fogCanvas);
const face    = new FaceTracker();
const gesture = new GestureTracker(drawCanvas);

const voice   = new VoiceCommands({
  onWipe:   () => doWipe(),
  onClear:  () => gesture.clear(),
  onStatus: (msg) => showVoiceStatus(msg),
});

// ── actions ───────────────────────────────────────────────

function doWipe() {
  gesture.clear();
  fog.wipe();
}

function showVoiceStatus(msg) {
  statusVoice.textContent = msg;
  statusVoice.classList.remove('voice-active');
  void statusVoice.offsetWidth;
  if (msg) statusVoice.classList.add('voice-active');
}

// ── face callbacks ─────────────────────────────────────────

face.onMouthOpen = (intensity) => {
  fog.breathe(intensity);
  setStatus('😮 fogging...');
};

face.onMouthClose = () => setStatus('');

// ── gesture callbacks ──────────────────────────────────────

gesture.onDrawState = (isDrawing) => {
  setStatus(isDrawing ? '☝️ drawing...' : '');
};

// ── status helper ──────────────────────────────────────────

let _statusTimer = null;
function setStatus(msg) {
  statusEl.textContent = msg;
  clearTimeout(_statusTimer);
  if (msg) _statusTimer = setTimeout(() => (statusEl.textContent = ''), 2500);
}

// ── toolbar ────────────────────────────────────────────────

btnWipe.addEventListener('click',  () => doWipe());
btnClear.addEventListener('click', () => gesture.clear());
btnSave.addEventListener('click',  () => gesture.saveSnapshot(videoEl, fogCanvas));
penColor.addEventListener('input', (e) => gesture.setColor(e.target.value));
penSize.addEventListener('input',  (e) => gesture.setSize(e.target.value));

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
