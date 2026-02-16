import { EQNode } from "./EQNode";
import { EffectsChain } from "./EffectsChain";

export class DeckEngine {
  private ctx: AudioContext;
  private source: AudioBufferSourceNode | null = null;
  private _buffer: AudioBuffer | null = null;
  private eq: EQNode;
  readonly effects: EffectsChain;
  private volumeGain: GainNode;
  private crossfadeGain: GainNode;
  private analyser: AnalyserNode;
  private _startTime: number = 0;
  private _pauseOffset: number = 0;
  private _playing: boolean = false;
  private _playbackRate: number = 1;
  private _keyLock: boolean = false;
  private _onEnded: (() => void) | null = null;
  // PFL (pre-fader listen) — cue output
  private pflGain: GainNode;
  private _pflEnabled: boolean = false;

  constructor(ctx: AudioContext, destination: AudioNode, pflDestination?: AudioNode) {
    this.ctx = ctx;
    this.eq = new EQNode(ctx);
    this.effects = new EffectsChain(ctx);
    this.volumeGain = ctx.createGain();
    this.crossfadeGain = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;

    // PFL cue send
    this.pflGain = ctx.createGain();
    this.pflGain.gain.value = 0;

    // Chain: EQ → Effects → volume → crossfade → analyser → destination
    this.eq.output.connect(this.effects.input);
    this.effects.output.connect(this.volumeGain);
    this.volumeGain.connect(this.crossfadeGain);
    this.crossfadeGain.connect(this.analyser);
    this.analyser.connect(destination);

    // PFL tap: pre-fader (before crossfade)
    this.volumeGain.connect(this.pflGain);
    if (pflDestination) {
      this.pflGain.connect(pflDestination);
    }
  }

  get buffer(): AudioBuffer | null {
    return this._buffer;
  }

  get playing(): boolean {
    return this._playing;
  }

  get currentTime(): number {
    if (this._playing) {
      return (this.ctx.currentTime - this._startTime) * this._playbackRate;
    }
    return this._pauseOffset;
  }

  get duration(): number {
    return this._buffer?.duration ?? 0;
  }

  set onEnded(cb: (() => void) | null) {
    this._onEnded = cb;
  }

  loadBuffer(buffer: AudioBuffer) {
    this.stop();
    this._buffer = buffer;
    this._pauseOffset = 0;
  }

  play() {
    if (!this._buffer || this._playing) return;
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this._buffer;
    this.source.playbackRate.value = this._playbackRate;
    // Key lock: use detune to compensate pitch shift from playback rate change
    if (this._keyLock && this._playbackRate !== 1) {
      // detune in cents: -1200 * log2(playbackRate) compensates the pitch shift
      this.source.detune.value = -1200 * Math.log2(this._playbackRate);
    } else {
      this.source.detune.value = 0;
    }
    this.source.connect(this.eq.input);
    this.source.start(0, this._pauseOffset);
    this._startTime = this.ctx.currentTime - this._pauseOffset / this._playbackRate;
    this._playing = true;
    this.source.onended = () => {
      if (this._playing) {
        this._playing = false;
        this._pauseOffset = 0;
        this._onEnded?.();
      }
    };
  }

  pause() {
    if (!this._playing || !this.source) return;
    this._pauseOffset = this.currentTime;
    this._playing = false;
    try {
      this.source.stop();
    } catch {
      // ignore if already stopped
    }
    this.source = null;
  }

  stop() {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // ignore
      }
      this.source = null;
    }
    this._playing = false;
    this._pauseOffset = 0;
  }

  seek(time: number) {
    const wasPlaying = this._playing;
    if (wasPlaying) this.pause();
    this._pauseOffset = Math.max(0, Math.min(time, this.duration));
    if (wasPlaying) this.play();
  }

  setVolume(value: number) {
    // value: 0-100
    this.volumeGain.gain.setTargetAtTime(value / 100, this.ctx.currentTime, 0.01);
  }

  setCrossfadeGain(value: number) {
    // value: 0-1
    this.crossfadeGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
  }

  setEqHi(value: number) {
    this.eq.setHi(value);
  }

  setEqMid(value: number) {
    this.eq.setMid(value);
  }

  setEqLo(value: number) {
    this.eq.setLo(value);
  }

  setPlaybackRate(rate: number) {
    this._playbackRate = rate;
    if (this.source) {
      this.source.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, 0.01);
      // Key lock compensation
      if (this._keyLock) {
        this.source.detune.setTargetAtTime(-1200 * Math.log2(rate), this.ctx.currentTime, 0.01);
      } else {
        this.source.detune.setTargetAtTime(0, this.ctx.currentTime, 0.01);
      }
    }
  }

  setKeyLock(enabled: boolean) {
    this._keyLock = enabled;
    if (this.source) {
      if (enabled) {
        this.source.detune.setTargetAtTime(-1200 * Math.log2(this._playbackRate), this.ctx.currentTime, 0.01);
      } else {
        this.source.detune.setTargetAtTime(0, this.ctx.currentTime, 0.01);
      }
    }
  }

  get keyLock(): boolean {
    return this._keyLock;
  }

  // PFL / headphone cue
  setPFL(enabled: boolean) {
    this._pflEnabled = enabled;
    this.pflGain.gain.setTargetAtTime(enabled ? 1 : 0, this.ctx.currentTime, 0.01);
  }

  get pflEnabled(): boolean {
    return this._pflEnabled;
  }

  getAnalyserData(): Uint8Array {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  // Get full frequency data for spectrum analyzer (higher resolution)
  getSpectrumData(): Uint8Array {
    // Use the analyser with current fftSize
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  getVULevel(): number {
    const data = this.getAnalyserData();
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return (sum / data.length / 255) * 100;
  }

  // Autogain: analyze peak level of buffer and return recommended gain (0-100 scale)
  getAutogainLevel(): number {
    if (!this._buffer) return 80;
    const channelData = this._buffer.getChannelData(0);
    let peak = 0;
    // Sample every 100th value for speed
    for (let i = 0; i < channelData.length; i += 100) {
      const abs = Math.abs(channelData[i]);
      if (abs > peak) peak = abs;
    }
    if (peak === 0) return 80;
    // Target peak at 0.85 (leave headroom)
    const targetGain = 0.85 / peak;
    // Convert to 0-100 scale, clamped
    return Math.round(Math.min(100, Math.max(20, targetGain * 80)));
  }
}
