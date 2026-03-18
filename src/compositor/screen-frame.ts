import { type Rect } from '../utils/geometry';

export function drawScreenFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  rect: Rect,
  borderRadius: number,
  shadow: { blur: number; color: string; offsetY: number }
) {
  const { x, y, width, height } = rect;

  ctx.save();

  // Draw shadow
  if (shadow.blur > 0) {
    ctx.shadowBlur = shadow.blur;
    ctx.shadowColor = shadow.color;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = shadow.offsetY;

    // Draw a filled rounded rect to cast the shadow
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, borderRadius);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();

    // Reset shadow before drawing video
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetY = 0;
  }

  // Clip to rounded rect
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.clip();

  // Draw video frame
  if (video.readyState >= 2) {
    ctx.drawImage(video, x, y, width, height);
  }

  ctx.restore();
}
