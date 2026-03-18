export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function centerRect(
  containerW: number,
  containerH: number,
  padding: number
): Rect {
  return {
    x: padding,
    y: padding,
    width: containerW - padding * 2,
    height: containerH - padding * 2,
  };
}

export function fitRect(
  srcW: number,
  srcH: number,
  destW: number,
  destH: number
): Rect {
  const scale = Math.min(destW / srcW, destH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return {
    x: (destW - w) / 2,
    y: (destH - h) / 2,
    width: w,
    height: h,
  };
}
