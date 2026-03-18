// CaptureController is not yet in standard TS lib types
declare global {
  interface CaptureController {
    addEventListener(type: string, listener: (e: any) => void): void;
  }
  var CaptureController: {
    new (): CaptureController;
    prototype: CaptureController;
  };
}

export interface ScreenCapture {
  stream: MediaStream;
  video: HTMLVideoElement;
  controller: CaptureController | null;
  stop: () => void;
}

export async function startScreenCapture(
  frameRate: number,
  systemAudio: boolean
): Promise<ScreenCapture> {
  let controller: CaptureController | null = null;

  const constraints: DisplayMediaStreamOptions = {
    video: {
      frameRate: { ideal: frameRate },
    } as MediaTrackConstraints,
    audio: systemAudio
      ? { suppressLocalAudioPlayback: false } as any
      : false,
  };

  // Use CaptureController for cursor tracking if available
  if ('CaptureController' in window) {
    controller = new CaptureController();
    (constraints as any).controller = controller;
  }

  // Always keep the native cursor in the captured stream
  // so drag ghosts, tooltips, resize cursors etc. are visible
  // We overlay our highlight/glow effects on top
  if (constraints.video && typeof constraints.video === 'object') {
    (constraints.video as any).cursor = 'always';
  }

  const stream = await navigator.mediaDevices.getDisplayMedia(constraints);

  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  const stop = () => {
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };

  // Auto-stop if user ends sharing via browser UI
  stream.getVideoTracks()[0]?.addEventListener('ended', stop);

  return { stream, video, controller, stop };
}
