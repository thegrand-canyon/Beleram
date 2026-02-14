import { EQNode } from "./EQNode";

export class DeckEngine {
  private ctx: AudioContext;
  private source: AudioBufferSourceNode | null = null;
  private _buffer: AudioBuffer | null = null;
  private eq: EQNode;
  private volumeGain: GainNode;
  private crossfadeGain: GainNode;
  private analyser: AnalyserNode;
  private _startTime: number = 0;
  private _pauseOffset: number = 0;
  private _playing: boolean = false;
  private _playbackRate: number = 1;
  private _onEnded: (() => void) | null = null;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.eq = new EQNode(ctx);
    this.volumeGain = ctx.createGain();
    this.crossfadeGain = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;

    // Chain: EQ → volume → crossfade → analyser → destination
    this.eq.output.connect(this.volumeGain);
    this.volumeGain.connect(this.crossfadeGain);
    this.crossfadeGain.connect(this.analyser);
    this.analyser.connect(destination);
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
    }
  }

  getAnalyserData(): Uint8Array {
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
}
