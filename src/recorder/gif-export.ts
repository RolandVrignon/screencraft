// @ts-expect-error gif.js is UMD, no types
import GIF from 'gif.js';

export interface GifExportOptions {
  width: number;
  height: number;
  frameRate: number;
  quality: number; // 1 (best) to 20 (fastest)
  onProgress?: (progress: number) => void;
}

export interface GifRecorderHandle {
  captureFrame: (canvas: HTMLCanvasElement) => void;
  finish: () => Promise<Blob>;
  abort: () => void;
  frameCount: () => number;
}

export function createGifRecorder(options: GifExportOptions): GifRecorderHandle {
  const { width, height, frameRate, quality, onProgress } = options;
  const delay = Math.round(1000 / frameRate);

  // Scale to 1920px wide max — keeps text readable while limiting file size
  const maxWidth = 1920;
  const scale = width > maxWidth ? maxWidth / width : 1;
  const gifWidth = Math.round(width * scale);
  const gifHeight = Math.round(height * scale);

  const gif = new GIF({
    workers: 4,
    quality,
    width: gifWidth,
    height: gifHeight,
    workerScript: '/gif.worker.js',
    repeat: 0, // loop forever
  });

  // Temp canvas for scaling frames
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = gifWidth;
  tempCanvas.height = gifHeight;
  const tempCtx = tempCanvas.getContext('2d')!;

  let frames = 0;

  return {
    captureFrame(canvas: HTMLCanvasElement) {
      // Scale the source canvas down to GIF size
      tempCtx.drawImage(canvas, 0, 0, gifWidth, gifHeight);
      // Copy pixel data (gif.js needs a fresh copy per frame)
      const imageData = tempCtx.getImageData(0, 0, gifWidth, gifHeight);
      gif.addFrame(imageData, { delay, copy: true });
      frames++;
    },

    finish() {
      return new Promise<Blob>((resolve, reject) => {
        if (frames === 0) {
          reject(new Error('No frames captured'));
          return;
        }

        gif.on('progress', (p: number) => {
          onProgress?.(p);
          // Update encoding dialog if present
          const bar = document.getElementById('gif-progress-bar');
          const text = document.getElementById('gif-progress-text');
          if (bar) bar.style.width = `${Math.round(p * 100)}%`;
          if (text) text.textContent = `${Math.round(p * 100)}%`;
        });

        gif.on('finished', (blob: Blob) => {
          resolve(blob);
        });

        gif.render();
      });
    },

    abort() {
      gif.abort();
    },

    frameCount() {
      return frames;
    },
  };
}
