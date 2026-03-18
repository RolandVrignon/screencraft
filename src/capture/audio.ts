export interface AudioMixer {
  destination: MediaStream;
  setMicGain: (v: number) => void;
  setSystemGain: (v: number) => void;
  addMic: (stream: MediaStream) => void;
  addSystem: (stream: MediaStream) => void;
  stop: () => void;
}

export function createAudioMixer(): AudioMixer {
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();

  const micGain = ctx.createGain();
  micGain.gain.value = 1.0;
  micGain.connect(dest);

  const systemGain = ctx.createGain();
  systemGain.gain.value = 1.0;
  systemGain.connect(dest);

  return {
    destination: dest.stream,

    setMicGain(v: number) {
      micGain.gain.value = v;
    },

    setSystemGain(v: number) {
      systemGain.gain.value = v;
    },

    addMic(stream: MediaStream) {
      const src = ctx.createMediaStreamSource(stream);
      src.connect(micGain);
    },

    addSystem(stream: MediaStream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;
      const audioStream = new MediaStream(audioTracks);
      const src = ctx.createMediaStreamSource(audioStream);
      src.connect(systemGain);
    },

    stop() {
      ctx.close();
    },
  };
}

export async function getMicStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
}
