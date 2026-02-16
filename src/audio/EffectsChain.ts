/**
 * Per-deck effects chain: Filter → Delay → Reverb → Flanger
 * Each effect has wet/dry control and can be toggled on/off.
 */
export interface EffectState {
  enabled: boolean;
  wetDry: number; // 0-100 (0 = dry, 100 = wet)
  param: number;  // 0-100, effect-specific primary parameter
}

export class EffectsChain {
  private ctx: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;

  // Filter (HP/LP sweep)
  private filterNode: BiquadFilterNode;
  private filterDry: GainNode;
  private filterWet: GainNode;
  private _filterEnabled = false;

  // Delay
  private delayNode: DelayNode;
  private delayFeedback: GainNode;
  private delayDry: GainNode;
  private delayWet: GainNode;
  private _delayEnabled = false;

  // Reverb
  private reverbConvolver: ConvolverNode;
  private reverbDry: GainNode;
  private reverbWet: GainNode;
  private _reverbEnabled = false;

  // Flanger
  private flangerDelay: DelayNode;
  private flangerLFO: OscillatorNode;
  private flangerLFOGain: GainNode;
  private flangerFeedback: GainNode;
  private flangerDry: GainNode;
  private flangerWet: GainNode;
  private _flangerEnabled = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // --- FILTER ---
    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = "lowpass";
    this.filterNode.frequency.value = 20000;
    this.filterNode.Q.value = 1;
    this.filterDry = ctx.createGain();
    this.filterDry.gain.value = 1;
    this.filterWet = ctx.createGain();
    this.filterWet.gain.value = 0;

    // --- DELAY ---
    this.delayNode = ctx.createDelay(2);
    this.delayNode.delayTime.value = 0.375; // dotted eighth at 128 BPM
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.4;
    this.delayDry = ctx.createGain();
    this.delayDry.gain.value = 1;
    this.delayWet = ctx.createGain();
    this.delayWet.gain.value = 0;
    // feedback loop
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);

    // --- REVERB ---
    this.reverbConvolver = ctx.createConvolver();
    this.reverbConvolver.buffer = this.generateReverbIR(2, 2);
    this.reverbDry = ctx.createGain();
    this.reverbDry.gain.value = 1;
    this.reverbWet = ctx.createGain();
    this.reverbWet.gain.value = 0;

    // --- FLANGER ---
    this.flangerDelay = ctx.createDelay(0.02);
    this.flangerDelay.delayTime.value = 0.005;
    this.flangerLFO = ctx.createOscillator();
    this.flangerLFO.type = "sine";
    this.flangerLFO.frequency.value = 0.5;
    this.flangerLFOGain = ctx.createGain();
    this.flangerLFOGain.gain.value = 0.003;
    this.flangerLFO.connect(this.flangerLFOGain);
    this.flangerLFOGain.connect(this.flangerDelay.delayTime);
    this.flangerLFO.start();
    this.flangerFeedback = ctx.createGain();
    this.flangerFeedback.gain.value = 0.5;
    this.flangerDelay.connect(this.flangerFeedback);
    this.flangerFeedback.connect(this.flangerDelay);
    this.flangerDry = ctx.createGain();
    this.flangerDry.gain.value = 1;
    this.flangerWet = ctx.createGain();
    this.flangerWet.gain.value = 0;

    // Wire the chain: input → filter stage → delay stage → reverb stage → flanger stage → output
    this.wireChain();
  }

  private wireChain() {
    // Disconnect everything first
    try { this.inputNode.disconnect(); } catch {}

    // Stage 1: Filter
    const filterMerge = this.ctx.createGain();
    this.inputNode.connect(this.filterDry);
    this.inputNode.connect(this.filterNode);
    this.filterNode.connect(this.filterWet);
    this.filterDry.connect(filterMerge);
    this.filterWet.connect(filterMerge);

    // Stage 2: Delay
    const delayMerge = this.ctx.createGain();
    filterMerge.connect(this.delayDry);
    filterMerge.connect(this.delayNode);
    this.delayNode.connect(this.delayWet);
    this.delayDry.connect(delayMerge);
    this.delayWet.connect(delayMerge);

    // Stage 3: Reverb
    const reverbMerge = this.ctx.createGain();
    delayMerge.connect(this.reverbDry);
    delayMerge.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWet);
    this.reverbDry.connect(reverbMerge);
    this.reverbWet.connect(reverbMerge);

    // Stage 4: Flanger
    reverbMerge.connect(this.flangerDry);
    reverbMerge.connect(this.flangerDelay);
    this.flangerDelay.connect(this.flangerWet);
    this.flangerDry.connect(this.outputNode);
    this.flangerWet.connect(this.outputNode);
  }

  get input(): AudioNode {
    return this.inputNode;
  }

  get output(): AudioNode {
    return this.outputNode;
  }

  // Generate impulse response for reverb
  private generateReverbIR(duration: number, decay: number): AudioBuffer {
    const length = this.ctx.sampleRate * duration;
    const ir = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return ir;
  }

  // --- FILTER CONTROLS ---
  setFilter(enabled: boolean, param: number, wetDry: number) {
    this._filterEnabled = enabled;
    const t = this.ctx.currentTime;
    if (!enabled) {
      this.filterDry.gain.setTargetAtTime(1, t, 0.01);
      this.filterWet.gain.setTargetAtTime(0, t, 0.01);
      return;
    }
    const wet = wetDry / 100;
    this.filterDry.gain.setTargetAtTime(1 - wet, t, 0.01);
    this.filterWet.gain.setTargetAtTime(wet, t, 0.01);

    // param 0-100: 0 = LP 200Hz, 50 = bypass (20kHz LP), 100 = HP 200Hz
    if (param <= 50) {
      this.filterNode.type = "lowpass";
      // Map 0→200Hz, 50→20000Hz (exponential)
      const freq = 200 * Math.pow(100, param / 50);
      this.filterNode.frequency.setTargetAtTime(Math.min(freq, 20000), t, 0.02);
    } else {
      this.filterNode.type = "highpass";
      // Map 50→20Hz, 100→5000Hz (exponential)
      const p = (param - 50) / 50;
      const freq = 20 * Math.pow(250, p);
      this.filterNode.frequency.setTargetAtTime(freq, t, 0.02);
    }
    this.filterNode.Q.setTargetAtTime(1 + (Math.abs(param - 50) / 50) * 8, t, 0.02);
  }

  // --- DELAY CONTROLS ---
  setDelay(enabled: boolean, param: number, wetDry: number) {
    this._delayEnabled = enabled;
    const t = this.ctx.currentTime;
    if (!enabled) {
      this.delayDry.gain.setTargetAtTime(1, t, 0.01);
      this.delayWet.gain.setTargetAtTime(0, t, 0.01);
      return;
    }
    const wet = wetDry / 100;
    this.delayDry.gain.setTargetAtTime(1 - wet * 0.5, t, 0.01);
    this.delayWet.gain.setTargetAtTime(wet, t, 0.01);
    // param controls delay time: 0 = 1/16 note, 50 = 1/4 note, 100 = 1/2 note at 128 BPM
    const delayTime = 0.06 + (param / 100) * 0.7;
    this.delayNode.delayTime.setTargetAtTime(delayTime, t, 0.02);
    this.delayFeedback.gain.setTargetAtTime(0.2 + (param / 100) * 0.5, t, 0.02);
  }

  // --- REVERB CONTROLS ---
  setReverb(enabled: boolean, param: number, wetDry: number) {
    this._reverbEnabled = enabled;
    const t = this.ctx.currentTime;
    if (!enabled) {
      this.reverbDry.gain.setTargetAtTime(1, t, 0.01);
      this.reverbWet.gain.setTargetAtTime(0, t, 0.01);
      return;
    }
    const wet = wetDry / 100;
    this.reverbDry.gain.setTargetAtTime(1 - wet * 0.3, t, 0.01);
    this.reverbWet.gain.setTargetAtTime(wet, t, 0.01);
    // param controls reverb size — regenerate IR with different decay
    if (param !== this._lastReverbParam) {
      this._lastReverbParam = param;
      const duration = 0.5 + (param / 100) * 4;
      const decay = 1 + (param / 100) * 3;
      this.reverbConvolver.buffer = this.generateReverbIR(duration, decay);
    }
  }
  private _lastReverbParam = -1;

  // --- FLANGER CONTROLS ---
  setFlanger(enabled: boolean, param: number, wetDry: number) {
    this._flangerEnabled = enabled;
    const t = this.ctx.currentTime;
    if (!enabled) {
      this.flangerDry.gain.setTargetAtTime(1, t, 0.01);
      this.flangerWet.gain.setTargetAtTime(0, t, 0.01);
      return;
    }
    const wet = wetDry / 100;
    this.flangerDry.gain.setTargetAtTime(1 - wet * 0.5, t, 0.01);
    this.flangerWet.gain.setTargetAtTime(wet, t, 0.01);
    // param controls LFO speed and depth
    this.flangerLFO.frequency.setTargetAtTime(0.1 + (param / 100) * 5, t, 0.02);
    this.flangerLFOGain.gain.setTargetAtTime(0.001 + (param / 100) * 0.008, t, 0.02);
    this.flangerFeedback.gain.setTargetAtTime(0.3 + (param / 100) * 0.5, t, 0.02);
  }
}
