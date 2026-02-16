import { DeckEngine } from "./DeckEngine";
import { SampleEngine } from "./SampleEngine";

export type CrossfaderCurve = "sharp" | "linear" | "smooth";

export class AudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private masterAnalyser: AnalyserNode;
  private pflGain: GainNode;
  readonly deckA: DeckEngine;
  readonly deckB: DeckEngine;
  readonly samples: SampleEngine;
  private _crossfaderCurve: CrossfaderCurve = "smooth";

  // Recording
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private _isRecording: boolean = false;

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 256;
    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // PFL bus
    this.pflGain = this.ctx.createGain();
    this.pflGain.gain.value = 0.8;
    this.pflGain.connect(this.ctx.destination);

    this.deckA = new DeckEngine(this.ctx, this.masterGain, this.pflGain);
    this.deckB = new DeckEngine(this.ctx, this.masterGain, this.pflGain);
    this.samples = new SampleEngine(this.ctx, this.masterGain);
  }

  async resume() {
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  get context(): AudioContext {
    return this.ctx;
  }

  async decodeFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    return this.ctx.decodeAudioData(arrayBuffer);
  }

  // Master volume: 0-100
  setMasterVolume(value: number) {
    this.masterGain.gain.setTargetAtTime(value / 100, this.ctx.currentTime, 0.01);
  }

  getMasterVULevel(): number {
    const data = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return (sum / data.length / 255) * 100;
  }

  // Crossfader curve
  set crossfaderCurve(curve: CrossfaderCurve) {
    this._crossfaderCurve = curve;
  }

  get crossfaderCurve(): CrossfaderCurve {
    return this._crossfaderCurve;
  }

  // Crossfade with curve selection
  setCrossfade(value: number) {
    const n = value / 100;
    let gainA: number, gainB: number;

    switch (this._crossfaderCurve) {
      case "sharp":
        // Hard cut — both decks full in center range, fast cut at edges
        gainA = n <= 0.05 ? 1 : n >= 0.95 ? 0 : n < 0.5 ? 1 : Math.cos((n - 0.5) * Math.PI);
        gainB = n >= 0.95 ? 1 : n <= 0.05 ? 0 : n > 0.5 ? 1 : Math.sin(n * Math.PI);
        break;
      case "linear":
        gainA = 1 - n;
        gainB = n;
        break;
      case "smooth":
      default:
        // Equal-power (default)
        gainA = Math.cos(n * Math.PI / 2);
        gainB = Math.sin(n * Math.PI / 2);
        break;
    }

    this.deckA.setCrossfadeGain(gainA);
    this.deckB.setCrossfadeGain(gainB);
  }

  // --- RECORDING ---
  startRecording(): boolean {
    if (this._isRecording) return false;
    try {
      this.mediaStreamDest = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.mediaStreamDest);
      this.recordedChunks = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      this.mediaRecorder = new MediaRecorder(this.mediaStreamDest.stream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.start(1000);
      this._isRecording = true;
      return true;
    } catch {
      return false;
    }
  }

  async stopRecordingAsync(): Promise<Blob | null> {
    if (!this._isRecording || !this.mediaRecorder) return null;
    return new Promise<Blob>((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder!.mimeType });
        this.recordedChunks = [];
        if (this.mediaStreamDest) {
          try { this.masterGain.disconnect(this.mediaStreamDest); } catch {}
          this.mediaStreamDest = null;
        }
        this._isRecording = false;
        resolve(blob);
      };
      this.mediaRecorder!.stop();
    });
  }

  get isRecording(): boolean {
    return this._isRecording;
  }
}
