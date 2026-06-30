// ============================================================
//  main.js  —  fogmirror
//  entry point: wires camera + audio + particles + draw + voice
// ============================================================

import { initCamera }    from './camera.js';
import { AudioAnalyser } from './audio.js';
import { FogSystem }     from './particles.js';
import { DrawLayer }     from './draw.js';
import { VoiceCommands } from './voice.js';

// ── element refs ──────────────────────────────────────────

const splash    = document.getElementById('splash');
const stage     = document.getElementById('stage');
const startBtn  = document.getElementById('start-btn');
const videoEl   = document.getElementById('mirror-video');
const fogCanvas = document.getElementById('fog-canvas');
const drawCanvas= document.getElementById('draw-canvas');
const breathBar = document.getElementById('breath-bar');
const statusVoice= document.getElementById('status-voice');
const btnWipe   = document.getElementById('btn-wipe');
const btnClear  = document.getElementById('btn-clear');
const btnSave   = document.getElementById('btn-save');
const penColor  = document.getElementById('pen-color');
const penSize   = document.getElementById('pen-size');

// ── modules ───────────────────────────────────────────────

const audio  = new AudioAnalyser();
const fog    = new FogSystem(fogCanvas);
const draw   = new DrawLayer(drawCanvas);

const voice  = new VoiceCommands({
  onWipe:   () => doWipe(),
  onClear:  () => draw.clear(),
  onStatus: (msg) => showVoiceStatus(msg),
});

// ── actions ───────────────────────────────────────────────

function doWipe() {
  draw.clear();
  fog.wipe();
}

function showVoiceStatus(msg) {
  statusVoice.textContent = msg;
  statusVoice.classList.remove('voice-active');
  void statusVoice.offsetWidth; // force reflow to restart animation
  if (msg) statusVoice.classList.add('voice-active');
}

// ── audio callbacks ───────────────────────────────────────

audio.onVolume = (level) => {
  // level 0–1, update breath meter bar
  breathBar.style.width = Math.min(level * 5 * 100, 100) + '%';
};

audio.onBreath = (intensity) => {
  console.log(`[main] breath detected, intensity=${intensity.toFixed(2)}`);
  fog.breathe(intensity);
};

// ── toolbar ───────────────────────────────────────────────

btnWipe.addEventListener('click',  () => doWipe());
btnClear.addEventListener('click', () => draw.clear());
btnSave.addEventListener('click',  () => draw.saveSnapshot(videoEl, fogCanvas));

penColor.addEventListener('input', (e) => draw.setColor(e.target.value));
penSize.addEventListener('input',  (e) => draw.setSize(e.target.value));

// ── startup ───────────────────────────────────────────────

startBtn.addEventListener('click', async () => {
  startBtn.textContent = '[ starting... ]';
  startBtn.disabled    = true;

  try {
    // camera
    await initCamera(videoEl);

    // mic + breath detection
    await audio.init();

    // voice commands (best-effort, no-throw)
    voice.init();

    // particle loop
    fog.start();

    // show the stage
    splash.classList.add('hidden');
    stage.classList.remove('hidden');

    // initial fog burst so the screen isn't empty
    setTimeout(() => fog.wipe(), 200);

  } catch (err) {
    console.error('[main] startup error:', err);
    startBtn.textContent = '[ permission denied — try again ]';
    startBtn.disabled    = false;
  }
});
