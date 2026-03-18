import './style.css';
import { store } from './state/store';
import { startScreenCapture, type ScreenCapture } from './capture/screen';
import { cursorTracker } from './capture/cursor';
import { startWebcam, type WebcamCapture } from './capture/webcam';
import { createAudioMixer, getMicStream, type AudioMixer } from './capture/audio';
import { RenderPipeline } from './compositor/pipeline';
import { createRecorder, downloadBlob, type RecorderHandle } from './recorder/recorder';
import { createGifRecorder, type GifRecorderHandle } from './recorder/gif-export';
import { optimizeGif } from './recorder/gif-optimize';
import { createSettingsPanel } from './ui/settings-panel';
import { icons } from './ui/icons';

// State
let screenCapture: ScreenCapture | null = null;
let webcamCapture: WebcamCapture | null = null;
let audioMixer: AudioMixer | null = null;
let pipeline: RenderPipeline | null = null;
let recorder: RecorderHandle | null = null;
let gifRecorder: GifRecorderHandle | null = null;
let gifCaptureInterval: ReturnType<typeof setInterval> | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let recordingStartTime = 0;

// DOM
const app = document.getElementById('app')!;

app.innerHTML = `
  <div class="toolbar">
    <div class="toolbar-brand">
      ${icons.logo}
      <span>ScreenCraft</span>
    </div>
    <div class="toolbar-center">
      <div class="status-dot" id="status-dot"></div>
      <span class="timer" id="timer">00:00</span>
    </div>
    <div class="toolbar-right">
      <button class="btn btn-primary" id="btn-capture">
        ${icons.monitor}
        <span>Start Capture</span>
      </button>
      <button class="btn btn-record" id="btn-record" disabled>
        ${icons.record}
        <span>Record</span>
      </button>
      <button class="btn btn-icon" id="btn-pause" disabled title="Pause">
        ${icons.pause}
      </button>
      <button class="btn btn-icon" id="btn-stop" disabled title="Stop">
        ${icons.stop}
      </button>
    </div>
  </div>
  <div class="main-content">
    <div class="preview-area" id="preview-area">
      <div class="preview-idle" id="preview-idle">
        ${icons.monitor}
        <p>Click <strong>"Start Capture"</strong> to select a screen or window</p>
        <p style="font-size: 12px; color: var(--text-muted)">Your recording will be composited with beautiful backgrounds, cursor effects, and more</p>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px">
          <kbd style="background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-light); font-size: 11px">Ctrl+Shift+Z</kbd>
          Hold to zoom &nbsp;|&nbsp; Click preview to zoom at point
        </p>
      </div>
      <div class="preview-wrapper" id="preview-wrapper" style="display: none;">
        <canvas id="output-canvas"></canvas>
      </div>
    </div>
    <div id="settings-container"></div>
  </div>
`;

// Mount settings panel
const settingsContainer = document.getElementById('settings-container')!;
settingsContainer.appendChild(createSettingsPanel());

// Elements
const btnCapture = document.getElementById('btn-capture') as HTMLButtonElement;
const btnRecord = document.getElementById('btn-record') as HTMLButtonElement;
const btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
const btnStop = document.getElementById('btn-stop') as HTMLButtonElement;
const timerEl = document.getElementById('timer')!;
const statusDot = document.getElementById('status-dot')!;
const previewIdle = document.getElementById('preview-idle')!;
const previewWrapper = document.getElementById('preview-wrapper')!;
const canvas = document.getElementById('output-canvas') as HTMLCanvasElement;

// Initialize pipeline
pipeline = new RenderPipeline(canvas);

// Start Capture
btnCapture.addEventListener('click', async () => {
  try {
    const state = store.getAll();

    // Stop existing capture
    if (screenCapture) {
      screenCapture.stop();
      pipeline!.setScreenVideo(null);
    }

    screenCapture = await startScreenCapture(state.frameRate, state.systemAudioEnabled);

    // Attach cursor tracker
    cursorTracker.attach(screenCapture.controller);

    // Setup canvas size
    const outputW = state.outputWidth;
    const outputH = state.outputHeight;
    pipeline!.resize(outputW, outputH);

    // Show preview
    previewIdle.style.display = 'none';
    previewWrapper.style.display = 'block';

    // Start rendering
    pipeline!.setScreenVideo(screenCapture.video);
    pipeline!.start();

    // Update UI
    btnCapture.innerHTML = `${icons.monitor}<span>Change Source</span>`;
    btnRecord.disabled = false;
    store.set('status', 'previewing');

    // Handle stream ending
    screenCapture.stream.getVideoTracks()[0]?.addEventListener('ended', () => {
      stopEverything();
    });

    // Setup webcam if enabled
    if (state.webcamEnabled) {
      await setupWebcam();
    }
  } catch (err) {
    console.error('Capture failed:', err);
  }
});

// Record
btnRecord.addEventListener('click', async () => {
  const state = store.getAll();

  if (state.status === 'recording') return;

  const isGif = state.outputFormat === 'gif';

  if (isGif) {
    // GIF mode: capture canvas frames at gifFrameRate
    gifRecorder = createGifRecorder({
      width: canvas.width,
      height: canvas.height,
      frameRate: state.gifFrameRate,
      quality: state.gifQuality,
    });

    const interval = Math.round(1000 / state.gifFrameRate);
    gifCaptureInterval = setInterval(() => {
      if (store.get('status') === 'recording') {
        gifRecorder!.captureFrame(canvas);
      }
    }, interval);
  } else {
    // WebM mode: setup audio + MediaRecorder
    audioMixer = createAudioMixer();

    if (state.systemAudioEnabled && screenCapture) {
      audioMixer.addSystem(screenCapture.stream);
    }

    if (state.micEnabled) {
      try {
        const micStream = await getMicStream();
        audioMixer.addMic(micStream);
      } catch (err) {
        console.warn('Mic access denied:', err);
      }
    }

    recorder = createRecorder(
      canvas,
      audioMixer.destination,
      state.frameRate,
      (blob) => {
        showExportDialog(blob, 'webm');
      }
    );

    recorder.start();
  }

  recordingStartTime = Date.now();
  startTimer();

  // Update UI
  store.set('status', 'recording');
  btnRecord.classList.add('recording');
  btnRecord.disabled = true;
  btnPause.disabled = !isGif; // pause not supported for GIF
  btnStop.disabled = false;
  statusDot.classList.add('recording');
  timerEl.classList.add('recording');
});

// Pause / Resume (WebM only)
btnPause.addEventListener('click', () => {
  const state = store.getAll();

  if (state.status === 'recording') {
    recorder?.pause();
    store.set('status', 'paused');
    btnPause.innerHTML = icons.play;
    btnPause.title = 'Resume';
    statusDot.classList.remove('recording');
    statusDot.classList.add('paused');
    stopTimer();
  } else if (state.status === 'paused') {
    recorder?.resume();
    store.set('status', 'recording');
    btnPause.innerHTML = icons.pause;
    btnPause.title = 'Pause';
    statusDot.classList.remove('paused');
    statusDot.classList.add('recording');
    startTimer();
  }
});

// Stop
btnStop.addEventListener('click', async () => {
  const isGif = store.get('outputFormat') === 'gif';

  if (isGif && gifRecorder) {
    // Stop GIF frame capture
    if (gifCaptureInterval) {
      clearInterval(gifCaptureInterval);
      gifCaptureInterval = null;
    }

    // Show encoding progress
    store.set('status', 'exporting');
    const frameCount = gifRecorder.frameCount();
    showGifEncodingDialog(frameCount);

    try {
      const rawBlob = await gifRecorder.finish();

      // Post-process with gifsicle for compression
      updateEncodingStage('Compressing...');
      const state = store.getAll();
      const optimizedBlob = await optimizeGif(rawBlob, {
        lossy: state.gifLossy,
        colors: state.gifColors,
        optimizeLevel: 3,
      });

      const savings = Math.round((1 - optimizedBlob.size / rawBlob.size) * 100);
      console.log(`GIF optimized: ${(rawBlob.size / 1024 / 1024).toFixed(1)}MB → ${(optimizedBlob.size / 1024 / 1024).toFixed(1)}MB (-${savings}%)`);

      removeEncodingDialog();
      showExportDialog(optimizedBlob, 'gif');
    } catch (err) {
      console.error('GIF encoding/optimization failed:', err);
      removeEncodingDialog();
    }

    gifRecorder = null;
  } else if (recorder) {
    await recorder.stop();
  }

  resetRecordingUI();

  audioMixer?.stop();
  audioMixer = null;
  recorder = null;
});

// Webcam toggle reactivity
store.subscribe(async (state, key) => {
  if (key === 'webcamEnabled') {
    if (state.webcamEnabled && state.status !== 'idle') {
      await setupWebcam();
    } else if (!state.webcamEnabled && webcamCapture) {
      webcamCapture.stop();
      webcamCapture = null;
      pipeline!.setWebcamVideo(null);
    }
  }
});

// Timer
function startTimer() {
  timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');
  timerEl.textContent = `${mins}:${secs}`;
}

function resetRecordingUI() {
  store.set('status', 'previewing');
  btnRecord.classList.remove('recording');
  btnRecord.disabled = false;
  btnPause.disabled = true;
  btnPause.innerHTML = icons.pause;
  btnPause.title = 'Pause';
  btnStop.disabled = true;
  statusDot.className = 'status-dot';
  timerEl.classList.remove('recording');
  stopTimer();
}

// Helpers
async function setupWebcam() {
  try {
    webcamCapture = await startWebcam();
    pipeline!.setWebcamVideo(webcamCapture.video);
  } catch (err) {
    console.warn('Webcam access denied:', err);
    store.set('webcamEnabled', false);
  }
}

function stopEverything() {
  if (gifCaptureInterval) {
    clearInterval(gifCaptureInterval);
    gifCaptureInterval = null;
  }
  gifRecorder?.abort();
  gifRecorder = null;

  if (recorder && store.get('status') === 'recording') {
    recorder.stop();
  }

  screenCapture?.stop();
  screenCapture = null;
  webcamCapture?.stop();
  webcamCapture = null;
  audioMixer?.stop();
  audioMixer = null;
  pipeline?.stop();
  pipeline?.setScreenVideo(null);
  pipeline?.setWebcamVideo(null);

  stopTimer();

  store.set('status', 'idle');
  previewIdle.style.display = 'flex';
  previewWrapper.style.display = 'none';
  btnCapture.innerHTML = `${icons.monitor}<span>Start Capture</span>`;
  btnRecord.disabled = true;
  btnRecord.classList.remove('recording');
  btnPause.disabled = true;
  btnStop.disabled = true;
  statusDot.className = 'status-dot';
  timerEl.classList.remove('recording');
  timerEl.textContent = '00:00';
}

function showGifEncodingDialog(frameCount: number) {
  const overlay = document.createElement('div');
  overlay.className = 'export-overlay';
  overlay.id = 'gif-encoding-overlay';
  overlay.innerHTML = `
    <div class="export-dialog">
      <h3 id="gif-stage-title">Encoding GIF...</h3>
      <p class="file-size">${frameCount} frames</p>
      <div style="width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden;">
        <div id="gif-progress-bar" style="width: 0%; height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.2s;"></div>
      </div>
      <p class="file-size" id="gif-progress-text">0%</p>
    </div>
  `;
  document.body.appendChild(overlay);
}

function updateEncodingStage(stage: string) {
  const title = document.getElementById('gif-stage-title');
  const bar = document.getElementById('gif-progress-bar');
  const text = document.getElementById('gif-progress-text');
  if (title) title.textContent = stage;
  if (bar) bar.style.width = '100%';
  if (text) text.textContent = '';
}

function removeEncodingDialog() {
  document.getElementById('gif-encoding-overlay')?.remove();
}

function showExportDialog(blob: Blob, format: 'webm' | 'gif') {
  const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
  const ext = format;

  const overlay = document.createElement('div');
  overlay.className = 'export-overlay';
  overlay.innerHTML = `
    <div class="export-dialog">
      <h3>Recording Complete</h3>
      <p class="file-size">${ext.toUpperCase()} &mdash; ${sizeMB} MB</p>
      <div class="export-actions">
        <button class="btn" id="export-cancel">${icons.x} Dismiss</button>
        <button class="btn btn-primary" id="export-download">${icons.download} Download .${ext}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#export-download')!.addEventListener('click', () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadBlob(blob, `screencraft-${timestamp}.${ext}`);
    overlay.remove();
  });

  overlay.querySelector('#export-cancel')!.addEventListener('click', () => {
    overlay.remove();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
