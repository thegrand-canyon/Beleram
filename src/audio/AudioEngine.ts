import { DeckEngine } from "./DeckEngine";

export class AudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  readonly deckA: DeckEngine;
  readonly deckB: DeckEngine;

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.deckA = new DeckEngine(this.ctx, this.masterGain);
    this.deckB = new DeckEngine(this.ctx, this.masterGain);
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
}
