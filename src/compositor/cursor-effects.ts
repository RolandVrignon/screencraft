import type { CursorState } from '../capture/cursor';
import type { Rect } from '../utils/geometry';

export function drawCursorEffects(
  ctx: CanvasRenderingContext2D,
  cursor: CursorState,
  screenRect: Rect,
  videoWidth: number,
  videoHeight: number,
  highlightColor: string,
  highlightRadius: number,
  _cursorScale: number
) {
  if (!cursor.visible) return;

  // Map cursor surface coordinates to canvas coordinates
  const scaleX = screenRect.width / videoWidth;
  const scaleY = screenRect.height / videoHeight;
  const cx = screenRect.x + cursor.x * scaleX;
  const cy = screenRect.y + cursor.y * scaleY;

  ctx.save();

  // Clip to screen rect so glow doesn't bleed outside the frame
  ctx.beginPath();
  ctx.rect(screenRect.x, screenRect.y, screenRect.width, screenRect.height);
  ctx.clip();

  // --- Highlight glow around cursor ---
  if (highlightRadius > 0) {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, highlightRadius);
    grad.addColorStop(0, highlightColor);
    grad.addColorStop(0.7, highlightColor.replace(/[\d.]+\)$/, '0.1)'));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, highlightRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Click pulse effect ---
  if (cursor.clicked) {
    const elapsed = performance.now() - cursor.clickTime;
    const progress = Math.min(elapsed / 400, 1);

    // Expanding ring
    const pulseRadius = highlightRadius * (1 + progress * 1.2);
    const pulseAlpha = 0.6 * (1 - progress);
    ctx.beginPath();
    ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = highlightColor.replace(/[\d.]+\)$/, `${pulseAlpha})`);
    ctx.lineWidth = 3;
    ctx.stroke();

    // Second outer ring (delayed)
    if (progress > 0.1) {
      const p2 = Math.min((progress - 0.1) / 0.9, 1);
      const ring2Radius = highlightRadius * (1.2 + p2 * 1.0);
      const ring2Alpha = 0.3 * (1 - p2);
      ctx.beginPath();
      ctx.arc(cx, cy, ring2Radius, 0, Math.PI * 2);
      ctx.strokeStyle = highlightColor.replace(/[\d.]+\)$/, `${ring2Alpha})`);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Inner flash
    const flashAlpha = 0.35 * (1 - progress);
    const flashRadius = highlightRadius * (0.4 + progress * 0.6);
    const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashRadius);
    flashGrad.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
    flashGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, flashRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Native cursor is already in the video stream (cursor: "always")
  // so we don't draw our own arrow — drag ghosts, tooltips, etc. are preserved

  ctx.restore();
}

export function getCursorCanvasPosition(
  cursor: CursorState,
  screenRect: Rect,
  videoWidth: number,
  videoHeight: number
): { x: number; y: number } {
  const scaleX = screenRect.width / videoWidth;
  const scaleY = screenRect.height / videoHeight;
  return {
    x: screenRect.x + cursor.x * scaleX,
    y: screenRect.y + cursor.y * scaleY,
  };
}
