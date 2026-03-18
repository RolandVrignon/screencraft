const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #BFF373 0%, #4EA65B 100%)',
  'linear-gradient(135deg, #BFF373 0%, #1a3a1a 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 100%)',
  'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
  'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)',
  'linear-gradient(135deg, #7f00ff 0%, #e100ff 100%)',
  'linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)',
];

export { PRESET_GRADIENTS };

// Offscreen canvas for parsing CSS gradients
let bgCanvas: HTMLCanvasElement | null = null;

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  type: 'gradient' | 'solid' | 'wallpaper',
  value: string,
  wallpaperImg?: HTMLImageElement | ImageBitmap | null
) {
  if (type === 'solid') {
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (type === 'wallpaper' && wallpaperImg) {
    // Cover the canvas
    const imgRatio = wallpaperImg.width / wallpaperImg.height;
    const canvasRatio = width / height;
    let sx = 0, sy = 0, sw = wallpaperImg.width, sh = wallpaperImg.height;
    if (imgRatio > canvasRatio) {
      sw = wallpaperImg.height * canvasRatio;
      sx = (wallpaperImg.width - sw) / 2;
    } else {
      sh = wallpaperImg.width / canvasRatio;
      sy = (wallpaperImg.height - sh) / 2;
    }
    ctx.drawImage(wallpaperImg, sx, sy, sw, sh, 0, 0, width, height);
    return;
  }

  // Gradient - parse CSS gradient string
  drawCSSGradient(ctx, width, height, value);
}

function drawCSSGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  css: string
) {
  // Use a helper canvas element to parse the CSS gradient
  if (!bgCanvas) {
    bgCanvas = document.createElement('canvas');
  }
  bgCanvas.width = width;
  bgCanvas.height = height;

  // Parse "linear-gradient(135deg, #color1 0%, #color2 100%)"
  const match = css.match(
    /linear-gradient\(\s*([\d.]+)deg\s*,\s*(.+)\s*\)/
  );
  if (!match) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const angle = parseFloat(match[1]);
  const stops = match[2].split(',').map((s) => s.trim());

  // Convert angle to gradient coordinates
  const rad = ((angle - 90) * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const len = Math.sqrt(width * width + height * height) / 2;

  const grad = ctx.createLinearGradient(
    cx - Math.cos(rad) * len,
    cy - Math.sin(rad) * len,
    cx + Math.cos(rad) * len,
    cy + Math.sin(rad) * len
  );

  stops.forEach((stop) => {
    const parts = stop.match(/(#[0-9a-fA-F]+|rgba?\([^)]+\))\s+([\d.]+)%/);
    if (parts) {
      grad.addColorStop(parseFloat(parts[2]) / 100, parts[1]);
    }
  });

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}
