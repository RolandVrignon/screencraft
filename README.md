# ScreenCraft

Web-based screen recorder that produces beautiful recordings with customizable backgrounds, cursor effects, smooth zoom, and GIF/WebM export.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)

## Features

- **Screen Capture** — Record any screen, window, or tab via `getDisplayMedia`
- **Beautiful Backgrounds** — 14 gradient presets or solid color behind your recording
- **Frame Styling** — Adjustable padding (0–120px), border radius (0–64px), and shadow
- **Cursor Effects** — Highlight glow and click pulse animation (requires Chrome 132+)
- **Smooth Zoom** — Auto-zoom on cursor pause, click on preview, or hold `Ctrl+Shift+Z`
- **Webcam Overlay** — Circular picture-in-picture in any corner
- **Audio** — System audio + microphone mixing via Web Audio API
- **GIF Export** — Canvas frame capture → gif.js encoding → gifsicle WASM compression
- **WebM Export** — MediaRecorder with VP9/Opus codec at up to 4K 60fps
- **Dark UI** — Settings panel with live preview

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

Open `http://localhost:5173` in **Chrome 132+** for full feature support.

## Usage

1. Click **Start Capture** and select a screen/window/tab
2. Adjust background, frame, cursor, and zoom settings in the right panel
3. Click **Record** to start recording
4. Click **Stop** to finish — download as GIF or WebM

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+Z` (hold) | Zoom in at cursor position |
| Click on preview | Zoom in at click point |

## Architecture

```
src/
├── capture/         # Screen, webcam, audio, cursor tracking
├── compositor/      # Canvas rendering pipeline
│   ├── background   # Gradient/solid/wallpaper renderer
│   ├── screen-frame # Rounded corners + shadow
│   ├── cursor-effects # Highlight glow + click pulse
│   ├── zoom         # Smooth ease-in-out zoom engine
│   └── webcam-overlay # Circular PiP
├── recorder/        # MediaRecorder (WebM) + gif.js/gifsicle (GIF)
├── state/           # Reactive store
├── ui/              # Settings panel + icons
└── main.ts          # App bootstrap
```

## Tech Stack

- **Vite** + **TypeScript** — zero runtime dependencies
- **Canvas 2D** — real-time compositing pipeline
- **getDisplayMedia** + **CaptureController** — screen capture with cursor tracking
- **gif.js** — GIF encoding in Web Workers
- **gifsicle-wasm-browser** — post-render GIF compression (O3 + lossy)
- **MediaRecorder** — WebM/VP9 video recording

## Browser Support

| Feature | Chrome 132+ | Chrome < 132 | Firefox |
|---|---|---|---|
| Screen capture | Yes | Yes | Yes |
| Cursor tracking | Yes | No | No |
| Cursor highlight | Yes | No | No |
| Auto zoom | Yes | Partial* | Partial* |
| GIF export | Yes | Yes | Yes |
| WebM export | Yes | Yes | Yes |

\* Zoom works via preview click and keyboard shortcut, but not via cursor pause detection.

## License

MIT
