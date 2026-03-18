export interface WebcamCapture {
  stream: MediaStream;
  video: HTMLVideoElement;
  stop: () => void;
}

export async function startWebcam(): Promise<WebcamCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 400 },
      height: { ideal: 400 },
      facingMode: 'user',
    },
    audio: false,
  });

  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  const stop = () => {
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };

  return { stream, video, stop };
}
