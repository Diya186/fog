# 🌫️ fogmirror

> breathe on it. write something. let it fade.

A browser-based mirror that responds to your breath — breathe out and fog appears. Write anything on it with your mouse or finger.

## features

- 📷 **mirrored camera** — like a real bathroom mirror
- 🌬️ **breath detection** — exhale into your mic, fog spawns
- ✍️ **freehand writing** — mouse or touch, pick any colour/size
- 🎙️ **voice commands** — say *"wipe"* to re-fog, *"clear"* to erase
- 📷 **save snapshot** — download your fog message as a PNG

## file structure

```
fogmirror/
├── index.html          ← entry point + layout
├── css/
│   └── style.css       ← dark mirror aesthetic
└── js/
    ├── main.js         ← wires everything together
    ├── camera.js       ← getUserMedia / video setup
    ├── audio.js        ← mic input + breath detection (Web Audio API)
    ├── particles.js    ← fog particle system (Canvas 2D)
    ├── draw.js         ← freehand drawing layer
    └── voice.js        ← speech recognition commands
```

## how to run locally

No build step. Just serve the folder:

```bash
# python
python3 -m http.server 8080

# node
npx serve .
```

Then open `http://localhost:8080` in Chrome or Edge.

> ⚠️ **must be served** (not opened as file://) — browsers block camera/mic on `file://`.

## deploy to GitHub Pages

1. Push this folder to a GitHub repo
2. Go to **Settings → Pages → Deploy from branch → main / root**
3. Done. Your fog mirror lives at `https://yourusername.github.io/fogmirror`

## browser support

| Feature | Chrome | Firefox | Safari |
|---|---|---|---|
| Camera + mic | ✅ | ✅ | ✅ |
| Breath detection | ✅ | ✅ | ✅ |
| Voice commands | ✅ | ❌ | partial |
| Save snapshot | ✅ | ✅ | ✅ |

Voice commands use the Web Speech API, which is Chrome/Edge only for now.

## voice commands

| Say | Does |
|---|---|
| `"wipe"` | clears drawing + floods screen with fog |
| `"clear"` | erases drawing only, keeps fog |

---

built with: Web Audio API · Canvas 2D · getUserMedia · Web Speech API · no frameworks
