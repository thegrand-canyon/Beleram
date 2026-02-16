import { DeckEngine } from "./DeckEngine";
import { SampleEngine } from "./SampleEngine";

export class AudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private pflGain: GainNode; // Headphone cue bus
  readonly deckA: DeckEngine;
  readonly deckB: DeckEngine;
  readonly samples: SampleEngine;

  // Recording
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private _isRecording: boolean = false;

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    // PFL bus — headphone pre-listen (routed to destination separately)
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

  // Equal-power crossfade. value: 0-100 (0 = full A, 100 = full B)
  setCrossfade(value: number) {
    const normalized = value / 100;
    this.deckA.setCrossfadeGain(Math.cos(normalized * Math.PI / 2));
    this.deckB.setCrossfadeGain(Math.sin(normalized * Math.PI / 2));
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
      this.mediaRecorder.start(1000); // collect data every second
      this._isRecording = true;
      return true;
    } catch {
      return false;
    }
  }

  stopRecording(): Blob | null {
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
    }) as unknown as Blob;
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
