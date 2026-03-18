export function drawWebcamOverlay(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  canvasWidth: number,
  canvasHeight: number,
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right',
  size: number
) {
  if (video.readyState < 2) return;

  const margin = 24;
  const radius = size / 2;

  let cx: number, cy: number;
  switch (position) {
    case 'bottom-right':
      cx = canvasWidth - margin - radius;
      cy = canvasHeight - margin - radius;
      break;
    case 'bottom-left':
      cx = margin + radius;
      cy = canvasHeight - margin - radius;
      break;
    case 'top-right':
      cx = canvasWidth - margin - radius;
      cy = margin + radius;
      break;
    case 'top-left':
      cx = margin + radius;
      cy = margin + radius;
      break;
  }

  ctx.save();

  // Shadow
  ctx.shadowBlur = 20;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowOffsetY = 4;

  // Border ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Clip to circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Draw webcam video (cropped to square center)
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cropSize = Math.min(vw, vh);
  const sx = (vw - cropSize) / 2;
  const sy = (vh - cropSize) / 2;

  ctx.drawImage(
    video,
    sx,
    sy,
    cropSize,
    cropSize,
    cx - radius,
    cy - radius,
    size,
    size
  );

  ctx.restore();
}
