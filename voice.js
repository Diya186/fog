// ============================================================
//  voice.js  —  fogmirror
//  speech recognition for voice commands
//  commands:  "wipe"  →  re-fog everything
//             "clear" →  erase drawing only
// ============================================================

const COMMANDS = {
  wipe:  ['wipe', 'white', 'wide', 'wife', 'type'], // homophones/misheard
  clear: ['clear', 'clean', 'clear it', 'erase'],
};

/** Fuzzy-match a transcript string to a known command key */
function matchCommand(transcript) {
  const t = transcript.toLowerCase().trim();
  for (const [cmd, variants] of Object.entries(COMMANDS)) {
    if (variants.some(v => t.includes(v))) return cmd;
  }
  return null;
}

export class VoiceCommands {
  /**
   * @param {{ onWipe: () => void, onClear: () => void, onStatus: (msg: string) => void }} handlers
   */
  constructor({ onWipe, onClear, onStatus }) {
    this.onWipe   = onWipe;
    this.onClear  = onClear;
    this.onStatus = onStatus;
    this._recog   = null;
    this._active  = false;
  }

  init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn('[voice] SpeechRecognition not supported in this browser');
      this.onStatus('voice commands unavailable');
      return;
    }

    this._recog = new SR();
    this._recog.continuous      = true;
    this._recog.interimResults  = false;
    this._recog.lang            = 'en-US';
    this._recog.maxAlternatives = 3;

    this._recog.onresult = (event) => {
      const results = event.results;
      const latest  = results[results.length - 1];

      // try all alternatives for better accuracy
      for (let i = 0; i < latest.length; i++) {
        const transcript = latest[i].transcript;
        const cmd        = matchCommand(transcript);

        if (cmd) {
          console.log(`[voice] command detected: "${transcript}" → ${cmd}`);
          this._dispatch(cmd);
          break;
        }
      }
    };

    this._recog.onerror = (e) => {
      if (e.error === 'no-speech') return; // expected silence, ignore
      console.warn('[voice] recognition error:', e.error);
    };

    this._recog.onend = () => {
      // auto-restart so it stays continuous
      if (this._active) {
        try { this._recog.start(); } catch (_) {}
      }
    };

    this._active = true;
    try {
      this._recog.start();
      console.log('[voice] listening for commands');
    } catch (err) {
      console.error('[voice] failed to start:', err);
    }
  }

  _dispatch(cmd) {
    switch (cmd) {
      case 'wipe':
        this.onStatus('❄️ wiping...');
        this.onWipe();
        break;
      case 'clear':
        this.onStatus('✏️ cleared');
        this.onClear();
        break;
    }
    setTimeout(() => this.onStatus(''), 2000);
  }

  destroy() {
    this._active = false;
    this._recog?.stop();
  }
}
