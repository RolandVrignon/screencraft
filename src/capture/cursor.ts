export interface CursorState {
  x: number;
  y: number;
  visible: boolean;
  clicked: boolean;
  clickTime: number;
}

export class CursorTracker {
  state: CursorState = {
    x: 0,
    y: 0,
    visible: false,
    clicked: false,
    clickTime: 0,
  };

  private supported = false;
  private _hasPosition = false;
  private clickListeners: Array<(x: number, y: number) => void> = [];

  // Micro-pause click detection
  private pauseDetectTimer: ReturnType<typeof setTimeout> | null = null;
  private pauseThresholdMs = 120; // ms of stillness = probable click
  private pauseDistanceThreshold = 3; // pixels of movement tolerance

  attach(controller: CaptureController | null) {
    if (!controller || !('oncapturedmousechange' in controller)) {
      this.supported = false;
      return;
    }

    this.supported = true;

    (controller as any).addEventListener(
      'capturedmousechange',
      (e: any) => {
        const { surfaceX, surfaceY } = e;
        if (surfaceX < 0 || surfaceY < 0) {
          this.state.visible = false;
          return;
        }

        const prevX = this.state.x;
        const prevY = this.state.y;
        this.state.x = surfaceX;
        this.state.y = surfaceY;
        this.state.visible = true;
        this._hasPosition = true;

        // Micro-pause detection: if cursor barely moves, it's likely a click
        const dist = Math.hypot(surfaceX - prevX, surfaceY - prevY);
        if (dist > this.pauseDistanceThreshold) {
          // Cursor is moving — reset pause timer
          if (this.pauseDetectTimer) {
            clearTimeout(this.pauseDetectTimer);
            this.pauseDetectTimer = null;
          }
          // Set a new timer to detect pause
          this.pauseDetectTimer = setTimeout(() => {
            // Cursor has been still long enough — treat as click
            this.fireClick(this.state.x, this.state.y);
          }, this.pauseThresholdMs);
        }
      }
    );
  }

  get isSupported(): boolean {
    return this.supported;
  }

  /** True if we've received at least one cursor position (even if cursor left the surface since) */
  get hasPosition(): boolean {
    return this._hasPosition;
  }

  onClickCapture(fn: (x: number, y: number) => void) {
    this.clickListeners.push(fn);
  }

  /** Fire a click event at given surface coordinates */
  fireClick(x: number, y: number) {
    this.state.clicked = true;
    this.state.clickTime = performance.now();
    this.clickListeners.forEach((fn) => fn(x, y));
    setTimeout(() => {
      this.state.clicked = false;
    }, 300);
  }

  /** Manually update position (for preview canvas click mapping) */
  manualUpdate(x: number, y: number) {
    this.state.x = x;
    this.state.y = y;
    this.state.visible = true;
  }
}

export const cursorTracker = new CursorTracker();
