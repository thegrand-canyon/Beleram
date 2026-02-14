export class EQNode {
  private loFilter: BiquadFilterNode;
  private midFilter: BiquadFilterNode;
  private hiFilter: BiquadFilterNode;

  constructor(ctx: AudioContext) {
    this.loFilter = ctx.createBiquadFilter();
    this.loFilter.type = "lowshelf";
    this.loFilter.frequency.value = 320;

    this.midFilter = ctx.createBiquadFilter();
    this.midFilter.type = "peaking";
    this.midFilter.frequency.value = 1000;
    this.midFilter.Q.value = 0.5;

    this.hiFilter = ctx.createBiquadFilter();
    this.hiFilter.type = "highshelf";
    this.hiFilter.frequency.value = 3200;

    // Chain: lo → mid → hi
    this.loFilter.connect(this.midFilter);
    this.midFilter.connect(this.hiFilter);
  }

  get input(): AudioNode {
    return this.loFilter;
  }

  get output(): AudioNode {
    return this.hiFilter;
  }

  // value: 0-100. 50 = neutral (0dB), 0 = -24dB (kill), 100 = +6dB
  private mapToDb(value: number): number {
    if (value <= 50) {
      return -24 + (value / 50) * 24; // -24 to 0
    }
    return ((value - 50) / 50) * 6; // 0 to +6
  }

  setHi(value: number) {
    this.hiFilter.gain.value = this.mapToDb(value);
  }

  setMid(value: number) {
    this.midFilter.gain.value = this.mapToDb(value);
  }

  setLo(value: number) {
    this.loFilter.gain.value = this.mapToDb(value);
  }
}
