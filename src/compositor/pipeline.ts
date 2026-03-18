import { store } from '../state/store';
import { cursorTracker } from '../capture/cursor';
import { drawBackground } from './background';
import { drawScreenFrame } from './screen-frame';
import { drawCursorEffects, getCursorCanvasPosition } from './cursor-effects';
import {
  type ZoomState,
  createZoomState,
  updateZoom,
  applyZoomTransform,
  triggerZoomIn,
  triggerZoomOut,
} from './zoom';
import { drawWebcamOverlay } from './webcam-overlay';
import { fitRect } from '../utils/geometry';

export class RenderPipeline {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screenVideo: HTMLVideoElement | null = null;
  private webcamVideo: HTMLVideoElement | null = null;
  private zoomState: ZoomState;
  private animFrameId = 0;
  private running = false;
  private zoomTimeout: ReturnType<typeof setTimeout> | null = null;
  private zoomHeld = false;
  // Track mouse position over the canvas for zoom targeting
  private mouseCanvasX = 0;
  private mouseCanvasY = 0;
  private mouseOnCanvas = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.zoomState = createZoomState();

    // Listen for cursor click events (micro-pause detection + manual triggers)
    cursorTracker.onClickCapture(() => {
      this.zoomAtCursor();
    });

    // Track mouse over canvas for zoom target
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouseCanvasX = (e.clientX - rect.left) * scaleX;
      this.mouseCanvasY = (e.clientY - rect.top) * scaleY;
      this.mouseOnCanvas = true;
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouseOnCanvas = false;
    });

    // Click on preview canvas → zoom at that point
    this.canvas.addEventListener('click', (e) => {
      this.handleCanvasClick(e);
    });
    this.canvas.style.cursor = 'crosshair';

    // Keyboard: hold Ctrl+Shift+Z to zoom at cursor position
    const isZoomShortcut = (e: KeyboardEvent) =>
      e.key === 'Z' && e.ctrlKey && e.shiftKey;

    document.addEventListener('keydown', (e) => {
      if (isZoomShortcut(e) && !e.repeat && !this.zoomHeld) {
        e.preventDefault();
        this.zoomHeld = true;
        this.zoomAtCursor();
      }
    });
    document.addEventListener('keyup', (e) => {
      // Release on any key-up of Z while held
      if (e.key === 'Z' && this.zoomHeld) {
        this.zoomHeld = false;
        this.zoomOutNow();
      }
    });
  }

  setScreenVideo(video: HTMLVideoElement | null) {
    this.screenVideo = video;
  }

  setWebcamVideo(video: HTMLVideoElement | null) {
    this.webcamVideo = video;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.render();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
    if (this.zoomTimeout) clearTimeout(this.zoomTimeout);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /** Trigger zoom at the current cursor position */
  zoomAtCursor() {
    const state = store.getAll();
    if (!state.autoZoom || !this.screenVideo) return;

    // Priority: last known tracked cursor > mouse on canvas > center
    let zoomX: number, zoomY: number;

    if (cursorTracker.isSupported && cursorTracker.hasPosition) {
      // Use last known cursor position (works even if cursor temporarily left the surface)
      const screenRect = this.getScreenRect();
      const pos = getCursorCanvasPosition(
        cursorTracker.state,
        screenRect,
        this.screenVideo.videoWidth,
        this.screenVideo.videoHeight
      );
      zoomX = pos.x;
      zoomY = pos.y;
    } else if (this.mouseOnCanvas) {
      zoomX = this.mouseCanvasX;
      zoomY = this.mouseCanvasY;
    } else {
      zoomX = this.canvas.width / 2;
      zoomY = this.canvas.height / 2;
    }

    triggerZoomIn(
      this.zoomState,
      zoomX,
      zoomY,
      state.zoomLevel,
      state.zoomDuration
    );

    // Auto zoom out after hold (unless Z key is held)
    if (!this.zoomHeld) {
      if (this.zoomTimeout) clearTimeout(this.zoomTimeout);
      this.zoomTimeout = setTimeout(() => {
        triggerZoomOut(this.zoomState, state.zoomDuration * 1.5);
      }, 1500);
    }
  }

  /** Trigger zoom at a specific canvas coordinate */
  zoomAtPoint(canvasX: number, canvasY: number) {
    const state = store.getAll();
    if (!state.autoZoom) return;

    triggerZoomIn(
      this.zoomState,
      canvasX,
      canvasY,
      state.zoomLevel,
      state.zoomDuration
    );

    if (!this.zoomHeld) {
      if (this.zoomTimeout) clearTimeout(this.zoomTimeout);
      this.zoomTimeout = setTimeout(() => {
        triggerZoomOut(this.zoomState, state.zoomDuration * 1.5);
      }, 1500);
    }
  }

  /** Force zoom out now */
  zoomOutNow() {
    const state = store.getAll();
    if (this.zoomTimeout) clearTimeout(this.zoomTimeout);
    triggerZoomOut(this.zoomState, state.zoomDuration);
  }

  private handleCanvasClick(e: MouseEvent) {
    if (!this.screenVideo || store.get('status') === 'idle') return;

    // Map click position from displayed canvas size to internal canvas coordinates
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    // Also trigger cursor click effect at that position
    const screenRect = this.getScreenRect();
    if (cursorTracker.isSupported) {
      // Map canvas coords back to surface coords for cursor effect
      const surfaceX = ((canvasX - screenRect.x) / screenRect.width) * this.screenVideo.videoWidth;
      const surfaceY = ((canvasY - screenRect.y) / screenRect.height) * this.screenVideo.videoHeight;
      cursorTracker.manualUpdate(surfaceX, surfaceY);
      cursorTracker.fireClick(surfaceX, surfaceY);
    }

    this.zoomAtPoint(canvasX, canvasY);
  }

  private getScreenRect() {
    const state = store.getAll();
    const padding = state.padding;
    const innerW = this.canvas.width - padding * 2;
    const innerH = this.canvas.height - padding * 2;

    if (!this.screenVideo || this.screenVideo.videoWidth === 0) {
      return { x: padding, y: padding, width: innerW, height: innerH };
    }

    const fit = fitRect(
      this.screenVideo.videoWidth,
      this.screenVideo.videoHeight,
      innerW,
      innerH
    );

    return {
      x: padding + fit.x,
      y: padding + fit.y,
      width: fit.width,
      height: fit.height,
    };
  }

  private render = () => {
    if (!this.running) return;

    const state = store.getAll();
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // 1. Clear
    ctx.clearRect(0, 0, width, height);

    // 2. Background
    drawBackground(ctx, width, height, state.background.type, state.background.value);

    // 3. Update zoom
    updateZoom(this.zoomState);

    // 4. Save and apply zoom
    ctx.save();
    applyZoomTransform(ctx, this.zoomState, width, height);

    // 5. Screen frame
    if (this.screenVideo) {
      const screenRect = this.getScreenRect();
      drawScreenFrame(
        ctx,
        this.screenVideo,
        screenRect,
        state.borderRadius,
        state.shadow
      );

      // 6. Cursor effects
      if (state.cursorHighlight && cursorTracker.isSupported) {
        drawCursorEffects(
          ctx,
          cursorTracker.state,
          screenRect,
          this.screenVideo.videoWidth,
          this.screenVideo.videoHeight,
          state.cursorHighlightColor,
          state.cursorHighlightRadius,
          state.cursorScale
        );
      }
    }

    // 7. Restore zoom
    ctx.restore();

    // 8. Webcam (drawn on top, unaffected by zoom)
    if (state.webcamEnabled && this.webcamVideo) {
      drawWebcamOverlay(
        ctx,
        this.webcamVideo,
        width,
        height,
        state.webcamPosition,
        state.webcamSize
      );
    }

    this.animFrameId = requestAnimationFrame(this.render);
  };
}
