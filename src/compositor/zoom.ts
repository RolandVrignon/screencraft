import { easeInOutCubic, clamp } from '../utils/easing';

export interface ZoomState {
  current: number;
  target: number;
  centerX: number;
  centerY: number;
  startTime: number;
  startZoom: number;
  duration: number;
  active: boolean;
}

export function createZoomState(): ZoomState {
  return {
    current: 1,
    target: 1,
    centerX: 0,
    centerY: 0,
    startTime: 0,
    startZoom: 1,
    duration: 300,
    active: false,
  };
}

export function triggerZoomIn(
  state: ZoomState,
  cx: number,
  cy: number,
  level: number,
  duration: number
) {
  state.target = level;
  state.centerX = cx;
  state.centerY = cy;
  state.startTime = performance.now();
  state.startZoom = state.current;
  state.duration = duration;
  state.active = true;
}

export function triggerZoomOut(state: ZoomState, duration: number) {
  state.target = 1;
  state.startTime = performance.now();
  state.startZoom = state.current;
  state.duration = duration;
  state.active = true;
}

export function updateZoom(state: ZoomState): boolean {
  if (!state.active) return false;

  const elapsed = performance.now() - state.startTime;
  const progress = clamp(elapsed / state.duration, 0, 1);
  const eased = easeInOutCubic(progress);

  state.current = state.startZoom + (state.target - state.startZoom) * eased;

  if (progress >= 1) {
    state.current = state.target;
    if (state.target === 1) {
      state.active = false;
    }
  }

  return state.active;
}

export function applyZoomTransform(
  ctx: CanvasRenderingContext2D,
  state: ZoomState,
  canvasWidth: number,
  canvasHeight: number
) {
  if (state.current <= 1.001) return;

  const zoom = state.current;
  const cx = state.centerX;
  const cy = state.centerY;

  // Translate so zoom center stays fixed
  const tx = cx - cx * zoom;
  const ty = cy - cy * zoom;

  // Clamp to keep viewport within bounds
  const maxTx = 0;
  const minTx = canvasWidth * (1 - zoom);
  const maxTy = 0;
  const minTy = canvasHeight * (1 - zoom);

  ctx.translate(
    clamp(tx, minTx, maxTx),
    clamp(ty, minTy, maxTy)
  );
  ctx.scale(zoom, zoom);
}
