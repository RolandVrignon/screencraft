export interface RecorderHandle {
  start: () => void;
  stop: () => Promise<Blob>;
  pause: () => void;
  resume: () => void;
  state: () => RecordingState;
}

type RecorderCallback = (blob: Blob) => void;

export function createRecorder(
  canvas: HTMLCanvasElement,
  audioStream: MediaStream | null,
  frameRate: number,
  onComplete: RecorderCallback
): RecorderHandle {
  const canvasStream = canvas.captureStream(frameRate);

  // Combine video and audio tracks
  const tracks = [...canvasStream.getVideoTracks()];
  if (audioStream) {
    tracks.push(...audioStream.getAudioTracks());
  }
  const combinedStream = new MediaStream(tracks);

  // Pick best supported codec
  const mimeType = getSupportedMimeType();

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  let resolveStop: ((blob: Blob) => void) | null = null;

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    onComplete(blob);
    if (resolveStop) resolveStop(blob);
  };

  return {
    start() {
      chunks.length = 0;
      recorder.start(1000); // timeslice for memory management
    },

    stop() {
      return new Promise<Blob>((resolve) => {
        resolveStop = resolve;
        recorder.stop();
      });
    },

    pause() {
      if (recorder.state === 'recording') {
        recorder.pause();
      }
    },

    resume() {
      if (recorder.state === 'paused') {
        recorder.resume();
      }
    },

    state() {
      return recorder.state;
    },
  };
}

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'video/webm';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
