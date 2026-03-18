export interface AppState {
  status: 'idle' | 'previewing' | 'recording' | 'paused' | 'exporting';

  background: {
    type: 'gradient' | 'solid' | 'wallpaper';
    value: string;
  };

  padding: number;
  borderRadius: number;
  shadow: {
    blur: number;
    color: string;
    offsetY: number;
  };

  cursorHighlight: boolean;
  cursorHighlightColor: string;
  cursorHighlightRadius: number;
  cursorScale: number;
  autoZoom: boolean;
  zoomLevel: number;
  zoomDuration: number;

  webcamEnabled: boolean;
  webcamPosition: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  webcamSize: number;

  micEnabled: boolean;
  systemAudioEnabled: boolean;

  outputFormat: 'webm' | 'gif';
  gifQuality: number; // 1 (best) to 20 (fastest)
  gifFrameRate: number; // GIF-specific fps (lower than video for size)
  gifLossy: number; // 0 = lossless, 40 = good, 200 = max compression
  gifColors: number; // 2-256, color palette size

  outputWidth: number;
  outputHeight: number;
  frameRate: number;
}

export const defaultState: AppState = {
  status: 'idle',
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, #BFF373 0%, #4EA65B 100%)',
  },
  padding: 48,
  borderRadius: 24,
  shadow: { blur: 60, color: 'rgba(0,0,0,0.5)', offsetY: 20 },

  cursorHighlight: true,
  cursorHighlightColor: 'rgba(99, 102, 241, 0.3)',
  cursorHighlightRadius: 24,
  cursorScale: 1.5,
  autoZoom: true,
  zoomLevel: 2.0,
  zoomDuration: 300,

  webcamEnabled: false,
  webcamPosition: 'bottom-right',
  webcamSize: 128,

  micEnabled: false,
  systemAudioEnabled: true,

  outputFormat: 'gif',
  gifQuality: 1,
  gifFrameRate: 15,
  gifLossy: 40,
  gifColors: 256,

  outputWidth: 3840,
  outputHeight: 2160,
  frameRate: 60,
};

type Listener = (state: AppState, key?: keyof AppState) => void;

class Store {
  private state: AppState;
  private listeners: Set<Listener> = new Set();

  constructor(initial: AppState) {
    this.state = { ...initial };
  }

  get<K extends keyof AppState>(key: K): AppState[K] {
    return this.state[key];
  }

  getAll(): Readonly<AppState> {
    return this.state;
  }

  set<K extends keyof AppState>(key: K, value: AppState[K]) {
    this.state[key] = value;
    this.listeners.forEach((fn) => fn(this.state, key));
  }

  update(partial: Partial<AppState>) {
    Object.assign(this.state, partial);
    this.listeners.forEach((fn) => fn(this.state));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const store = new Store(defaultState);
