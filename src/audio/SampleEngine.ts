/**
 * Sample pad engine — triggers one-shot audio samples through master output.
 * Supports 8 pads with built-in synthesized samples and custom file loading.
 */

export interface SamplePad {
  id: number;
  name: string;
  buffer: AudioBuffer | null;
  color: string;
}

export class SampleEngine {
  private ctx: AudioContext;
  private destination: AudioNode;
  private activeSources: Map<number, AudioBufferSourceNode> = new Map();
  pads: SamplePad[] = [];

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.destination = destination;
    this.initDefaultPads();
  }

  private initDefaultPads() {
    const defaults = [
      { name: "Kick", color: "#ff3366" },
      { name: "Snare", color: "#ff6633" },
      { name: "Clap", color: "#ffaa00" },
      { name: "Hi-Hat", color: "#00ff88" },
      { name: "Air Horn", color: "#00f0ff" },
      { name: "Riser", color: "#8866ff" },
      { name: "Impact", color: "#ff6ec7" },
      { name: "Vocal", color: "#aa88ff" },
    ];

    this.pads = defaults.map((d, i) => ({
      id: i,
      name: d.name,
      buffer: this.synthesizeSample(i),
      color: d.color,
    }));
  }

  private synthesizeSample(type: number): AudioBuffer {
    const sr = this.ctx.sampleRate;
    switch (type) {
      case 0: return this.synthKick(sr);
      case 1: return this.synthSnare(sr);
      case 2: return this.synthClap(sr);
      case 3: return this.synthHiHat(sr);
      case 4: return this.synthAirHorn(sr);
      case 5: return this.synthRiser(sr);
      case 6: return this.synthImpact(sr);
      case 7: return this.synthVocal(sr);
      default: return this.synthKick(sr);
    }
  }

  private synthKick(sr: number): AudioBuffer {
    const len = Math.floor(sr * 0.5);
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const freq = 150 * Math.exp(-t * 20) + 40;
      const env = Math.exp(-t * 8);
      data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.8;
    }
    return buf;
  }

  private synthSnare(sr: number): AudioBuffer {
    const len = Math.floor(sr * 0.3);
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const toneEnv = Math.exp(-t * 30);
      const noiseEnv = Math.exp(-t * 12);
      const tone = Math.sin(2 * Math.PI * 200 * t) * toneEnv * 0.5;
      const noise = (Math.random() * 2 - 1) * noiseEnv * 0.5;
      data[i] = tone + noise;
    }
    return buf;
  }

  private synthClap(sr: number): AudioBuffer {
    const len = Math.floor(sr * 0.3);
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 15);
      // Multiple short bursts
      const burst = t < 0.01 || (t > 0.015 && t < 0.025) || (t > 0.03 && t < 0.04);
      const noise = (Math.random() * 2 - 1) * (burst ? 0.8 : 0.3) * env;
      data[i] = noise;
    }
    return buf;
  }

  private synthHiHat(sr: number): AudioBuffer {
    const len = Math.floor(sr * 0.15);
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 40);
      // Band-passed noise
      const noise = (Math.random() * 2 - 1);
      data[i] = noise * env * 0.4;
    }
    return buf;
  }

  private synthAirHorn(sr: number): AudioBuffer {
    const len = Math.floor(sr * 1.5);
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const attack = Math.min(1, t * 10);
      const release = t > 1.2 ? Math.max(0, 1 - (t - 1.2) * 3) : 1;
      const env = attack * release;
      // Multiple harmonics for horn sound
      const sig = Math.sin(2 * Math.PI * 440 * t) * 0.4
        + Math.sin(2 * Math.PI * 554 * t) * 0.3
        + Math.sin(2 * Math.PI * 660 * t) * 0.2
        + Math.sin(2 * Math.PI * 880 * t) * 0.1;
      data[i] = sig * env * 0.6;
    }
    return buf;
  }

  private synthRiser(sr: number): AudioBuffer {
    const len = Math.floor(sr * 3);
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const progress = t / 3;
      const freq = 200 + progress * progress * 3000;
      const env = progress * 0.7;
      const noise = (Math.random() * 2 - 1) * progress * 0.15;
      data[i] = (Math.sin(2 * Math.PI * freq * t) * env + noise) * 0.5;
    }
    return buf;
  }

  private synthImpact(sr: number): AudioBuffer {
    const len = Math.floor(sr * 2);
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 3);
      const sub = Math.sin(2 * Math.PI * 30 * t) * env;
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 8) * 0.5;
      const thump = Math.sin(2 * Math.PI * 80 * Math.exp(-t * 5) * t) * Math.exp(-t * 6);
      data[i] = (sub * 0.5 + noise + thump * 0.4) * 0.6;
    }
    return buf;
  }

  private synthVocal(sr: number): AudioBuffer {
    const len = Math.floor(sr * 0.6);
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    // Formant synthesis — "hey" like sound
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.min(1, t * 20) * Math.exp(-t * 3);
      const f0 = 220;
      const sig = Array.from({ length: 8 }, (_, h) =>
        Math.sin(2 * Math.PI * f0 * (h + 1) * t) / ((h + 1) * 1.5)
      ).reduce((a, b) => a + b, 0);
      // Formant filter simulation via amplitude modulation
      const formant = 1 + 0.5 * Math.sin(2 * Math.PI * 3 * t);
      data[i] = sig * env * formant * 0.4;
    }
    return buf;
  }

  trigger(padIndex: number) {
    const pad = this.pads[padIndex];
    if (!pad?.buffer) return;

    // Stop any currently playing instance of this pad
    this.stop(padIndex);

    const source = this.ctx.createBufferSource();
    source.buffer = pad.buffer;
    source.connect(this.destination);
    source.start();
    this.activeSources.set(padIndex, source);
    source.onended = () => {
      this.activeSources.delete(padIndex);
    };
  }

  stop(padIndex: number) {
    const source = this.activeSources.get(padIndex);
    if (source) {
      try { source.stop(); } catch {}
      this.activeSources.delete(padIndex);
    }
  }

  async loadCustomSample(padIndex: number, file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.pads[padIndex] = {
      ...this.pads[padIndex],
      name: file.name.replace(/\.(mp3|wav|ogg|flac|m4a)$/i, ""),
      buffer: audioBuffer,
    };
  }
}
