/**
 * SmartTransition — beat-aware, energy-reactive auto-mix engine.
 *
 * Instead of a fixed countdown, this analyzes the outgoing deck's audio
 * in real-time and makes transition decisions based on:
 *   1. Beat grid (quantizes all moves to bar/phrase boundaries)
 *   2. Energy tracking (detects breakdowns and drops)
 *   3. Spectral content (knows when bass is absent = safe to swap)
 *
 * Transition flow:
 *   IDLE → TEASING → WAITING_FOR_BREAKDOWN → BLENDING → BASS_SWAP → DROPPING → FADEOUT → DONE
 */

import { DeckEngine } from "./DeckEngine";

export type SmartPhase =
  | "idle"
  | "teasing"          // Quietly introducing incoming track (just highs)
  | "waiting"          // Listening for a breakdown/low-energy section
  | "blending"         // Breakdown detected — opening up the blend
  | "bass_swap"        // Swapping bass between decks
  | "dropping"         // Energy spike detected — commit to new track
  | "fadeout"          // Fading out the old track
  | "done";

export interface SmartState {
  phase: SmartPhase;
  crossfader: number;
  eqA: { hi: number; mid: number; lo: number };
  eqB: { hi: number; mid: number; lo: number };
  volA: number;
  volB: number;
  progress: number;      // 0–100 for the progress bar
  statusText: string;
}

interface EnergyHistory {
  time: number;
  total: number;
  bass: number;
  mid: number;
  hi: number;
}

export class SmartTransition {
  private outgoing: DeckEngine;
  private incoming: DeckEngine;
  private bpm: number;
  private phase: SmartPhase = "idle";
  private phaseStartTime: number = 0;
  private energyHistory: EnergyHistory[] = [];
  private rollingAvgEnergy: number = 0;
  private peakEnergy: number = 0;
  private breakdownDetected: boolean = false;
  private dropDetected: boolean = false;
  private beatInterval: number; // seconds per beat
  private barInterval: number;  // seconds per bar (4 beats)
  private phraseInterval: number; // seconds per phrase (typically 8 bars = 32 beats)
  private startCrossfader: number;
  private minPhaseDuration: number = 4; // minimum seconds in any phase
  private startTime: number;
  private maxDuration: number = 90; // safety limit in seconds

  constructor(outgoing: DeckEngine, incoming: DeckEngine, bpm: number, startCrossfader: number) {
    this.outgoing = outgoing;
    this.incoming = incoming;
    this.bpm = Math.max(80, Math.min(180, bpm));
    this.beatInterval = 60 / this.bpm;
    this.barInterval = this.beatInterval * 4;
    this.phraseInterval = this.barInterval * 8;
    this.startCrossfader = startCrossfader;
    this.startTime = Date.now() / 1000;
    this.phase = "teasing";
    this.phaseStartTime = this.startTime;
  }

  /** Quantize a duration to the nearest bar boundary */
  private quantizeToBar(seconds: number): number {
    return Math.max(this.barInterval, Math.round(seconds / this.barInterval) * this.barInterval);
  }

  /** Analyze current frequency data and return energy bands */
  private analyzeEnergy(deck: DeckEngine): { total: number; bass: number; mid: number; hi: number } {
    const data = deck.getAnalyserData();
    const len = data.length;
    if (len === 0) return { total: 0, bass: 0, mid: 0, hi: 0 };

    // Split frequency bins into bands
    // For 256 FFT size, we get 128 bins
    // At 44100Hz sample rate: each bin = 44100/256 ≈ 172Hz
    // Bass: bins 0-5 (0-860Hz), Mid: bins 6-20 (860-3440Hz), Hi: bins 21+ (3440Hz+)
    const bassEnd = Math.floor(len * 0.04);  // ~0-860Hz
    const midEnd = Math.floor(len * 0.16);   // ~860-3400Hz

    let bassSum = 0, midSum = 0, hiSum = 0, total = 0;
    for (let i = 0; i < len; i++) {
      const v = data[i] / 255;
      total += v;
      if (i < bassEnd) bassSum += v;
      else if (i < midEnd) midSum += v;
      else hiSum += v;
    }

    return {
      total: (total / len) * 100,
      bass: bassEnd > 0 ? (bassSum / bassEnd) * 100 : 0,
      mid: (midEnd - bassEnd) > 0 ? (midSum / (midEnd - bassEnd)) * 100 : 0,
      hi: (len - midEnd) > 0 ? (hiSum / (len - midEnd)) * 100 : 0,
    };
  }

  /** Check if we're in a breakdown (sustained low energy) */
  private isBreakdown(): boolean {
    if (this.energyHistory.length < 10) return false;
    const recent = this.energyHistory.slice(-10);
    const avgRecent = recent.reduce((s, e) => s + e.total, 0) / recent.length;
    const avgBass = recent.reduce((s, e) => s + e.bass, 0) / recent.length;

    // Breakdown = energy significantly below rolling average AND bass is low
    return avgRecent < this.rollingAvgEnergy * 0.55 && avgBass < 25;
  }

  /** Check if energy just spiked (drop after breakdown) */
  private isDrop(): boolean {
    if (this.energyHistory.length < 5) return false;
    const recent = this.energyHistory.slice(-3);
    const prior = this.energyHistory.slice(-8, -3);
    if (prior.length < 3) return false;

    const recentAvg = recent.reduce((s, e) => s + e.total, 0) / recent.length;
    const priorAvg = prior.reduce((s, e) => s + e.total, 0) / prior.length;
    const recentBass = recent.reduce((s, e) => s + e.bass, 0) / recent.length;
    const priorBass = prior.reduce((s, e) => s + e.bass, 0) / prior.length;

    // Drop = sudden energy spike, especially in bass
    return (recentAvg > priorAvg * 1.6 && recentBass > priorBass * 2) ||
           (recentBass > 40 && priorBass < 15);
  }

  /** How long we've been in the current phase */
  private phaseElapsed(): number {
    return Date.now() / 1000 - this.phaseStartTime;
  }

  /** Total elapsed time */
  private totalElapsed(): number {
    return Date.now() / 1000 - this.startTime;
  }

  private advancePhase(next: SmartPhase) {
    this.phase = next;
    this.phaseStartTime = Date.now() / 1000;
  }

  /**
   * Called every ~50ms. Analyzes audio, decides transitions, returns current state.
   * This is the brain of the smart transition.
   */
  tick(): SmartState {
    const now = Date.now() / 1000;
    const energy = this.analyzeEnergy(this.outgoing);

    // Update history
    this.energyHistory.push({ time: now, ...energy });
    // Keep last 60 entries (~3 seconds at 50ms interval)
    if (this.energyHistory.length > 60) this.energyHistory.shift();

    // Update rolling average (use longer window)
    if (this.energyHistory.length > 5) {
      this.rollingAvgEnergy = this.energyHistory.reduce((s, e) => s + e.total, 0) / this.energyHistory.length;
      this.peakEnergy = Math.max(this.peakEnergy, energy.total);
    }

    const elapsed = this.phaseElapsed();
    const totalElapsed = this.totalElapsed();

    // Safety: force completion after maxDuration
    if (totalElapsed > this.maxDuration) {
      this.phase = "done";
    }

    // Estimate overall progress for the progress bar
    const phaseWeights: Record<SmartPhase, [number, number]> = {
      idle: [0, 0],
      teasing: [0, 15],
      waiting: [15, 35],
      blending: [35, 55],
      bass_swap: [55, 70],
      dropping: [70, 85],
      fadeout: [85, 100],
      done: [100, 100],
    };
    const [pStart, pEnd] = phaseWeights[this.phase];
    // Estimate phase progress (assume each phase ~8-16 seconds for progress calc)
    const estPhaseDuration = this.phase === "waiting" ? 20 : this.phase === "teasing" ? 8 : 10;
    const phaseProgress = Math.min(1, elapsed / estPhaseDuration);
    const progress = pStart + (pEnd - pStart) * phaseProgress;

    switch (this.phase) {
      case "teasing": {
        // Quietly introduce the incoming track — just high frequencies
        // Wait at least 2 phrases (or ~8 seconds), then move to waiting
        const minTime = this.quantizeToBar(Math.max(this.phraseInterval, 6));
        const p = Math.min(1, elapsed / Math.max(minTime, 8));

        const state: SmartState = {
          phase: this.phase,
          crossfader: this.startCrossfader + 10 * p,
          eqA: { hi: 50, mid: 50, lo: 50 },
          eqB: { hi: Math.round(15 + 20 * p), mid: Math.round(5 + 8 * p), lo: 0 },
          volA: 80,
          volB: Math.round(30 + 20 * p),
          progress,
          statusText: "Listening to the beat... teasing incoming track",
        };

        if (elapsed >= minTime) {
          this.advancePhase("waiting");
        }

        return state;
      }

      case "waiting": {
        // Actively listening for a breakdown or low-energy section
        // Keep incoming track quietly mixed in
        // If we detect a breakdown, move to blending
        // If no breakdown after ~30 seconds, force blend anyway
        const forceBlendAfter = this.quantizeToBar(Math.max(this.phraseInterval * 3, 24));
        const p = Math.min(1, elapsed / forceBlendAfter);
        const breakdownNow = this.isBreakdown();

        const state: SmartState = {
          phase: this.phase,
          crossfader: this.startCrossfader + 10 + 10 * p,
          eqA: { hi: 50, mid: 50, lo: 50 },
          eqB: { hi: Math.round(35 + 5 * p), mid: Math.round(13 + 10 * p), lo: 0 },
          volA: 80,
          volB: Math.round(50 + 10 * p),
          progress,
          statusText: breakdownNow
            ? "Breakdown detected! Blending in..."
            : `Waiting for breakdown... (${Math.round(energy.total)}% energy)`,
        };

        if (breakdownNow && elapsed > this.minPhaseDuration) {
          this.breakdownDetected = true;
          this.advancePhase("blending");
        } else if (elapsed >= forceBlendAfter) {
          // No breakdown detected, force the blend on a bar boundary
          this.advancePhase("blending");
        }

        return state;
      }

      case "blending": {
        // Breakdown happening or forced — open up the incoming track
        // Bring in mids, start crossfading more aggressively
        // Wait for energy to start building, or ~2 phrases
        const blendDuration = this.quantizeToBar(Math.max(this.phraseInterval * 1.5, 10));
        const p = Math.min(1, elapsed / blendDuration);
        const curve = 0.5 - 0.5 * Math.cos(p * Math.PI); // smooth

        const state: SmartState = {
          phase: this.phase,
          crossfader: this.startCrossfader + 20 + 20 * curve,
          eqA: {
            hi: 50,
            mid: Math.round(50 - 10 * curve),
            lo: Math.round(50 - 15 * curve),
          },
          eqB: {
            hi: 50,
            mid: Math.round(23 + 27 * curve),
            lo: Math.round(5 + 15 * curve),
          },
          volA: 80,
          volB: Math.round(60 + 20 * curve),
          progress,
          statusText: this.breakdownDetected
            ? "Blending during breakdown..."
            : "Opening up the blend...",
        };

        if (p >= 1) {
          this.advancePhase("bass_swap");
        }

        return state;
      }

      case "bass_swap": {
        // The critical moment — swap bass between decks
        // Try to detect if we're hitting a drop. If so, snap the bass swap instantly.
        // Otherwise, do a smooth swap over 1-2 bars
        const swapDuration = this.quantizeToBar(Math.max(this.barInterval * 2, 3));
        const p = Math.min(1, elapsed / swapDuration);
        const dropNow = this.isDrop();

        // If drop detected, instantly complete the bass swap
        const swapAmount = dropNow ? 1 : (0.5 - 0.5 * Math.cos(p * Math.PI));

        const state: SmartState = {
          phase: this.phase,
          crossfader: this.startCrossfader + 40 + 15 * swapAmount,
          eqA: {
            hi: 50,
            mid: Math.round(40 - 5 * swapAmount),
            lo: Math.round(35 - 30 * swapAmount),
          },
          eqB: {
            hi: 50,
            mid: 50,
            lo: Math.round(20 + 30 * swapAmount),
          },
          volA: 80,
          volB: 80,
          progress,
          statusText: dropNow
            ? "Drop detected! Bass swap!"
            : "Swapping bass...",
        };

        if (dropNow || p >= 1) {
          this.dropDetected = dropNow;
          this.advancePhase("dropping");
        }

        return state;
      }

      case "dropping": {
        // Commit to the new track
        // If we detected a real drop, snap hard. Otherwise smooth transition.
        const dropDuration = this.dropDetected
          ? this.quantizeToBar(this.barInterval) // Just 1 bar for a real drop
          : this.quantizeToBar(this.phraseInterval); // 1 phrase for a gradual commit
        const p = Math.min(1, elapsed / Math.max(dropDuration, 2));
        const snap = this.dropDetected ? Math.min(1, p * 4) : (0.5 - 0.5 * Math.cos(p * Math.PI));

        const state: SmartState = {
          phase: this.phase,
          crossfader: this.startCrossfader + 55 + 30 * snap,
          eqA: {
            hi: Math.round(50 - 30 * snap),
            mid: Math.round(35 - 25 * snap),
            lo: 5,
          },
          eqB: { hi: 50, mid: 50, lo: 50 },
          volA: Math.round(80 - 40 * snap),
          volB: 80,
          progress,
          statusText: this.dropDetected
            ? "Riding the drop!"
            : "Committing to new track...",
        };

        if (p >= 1) {
          this.advancePhase("fadeout");
        }

        return state;
      }

      case "fadeout": {
        // Final fade out of the old track over ~1 phrase
        const fadeDuration = this.quantizeToBar(Math.max(this.phraseInterval * 0.5, 4));
        const p = Math.min(1, elapsed / fadeDuration);
        const fade = 0.5 + 0.5 * Math.cos(p * Math.PI); // 1→0

        const state: SmartState = {
          phase: this.phase,
          crossfader: this.startCrossfader + 85 + 15 * (1 - fade),
          eqA: {
            hi: Math.round(20 * fade),
            mid: Math.round(10 * fade),
            lo: Math.round(5 * fade),
          },
          eqB: { hi: 50, mid: 50, lo: 50 },
          volA: Math.round(40 * fade * fade),
          volB: 80,
          progress,
          statusText: "Fading out...",
        };

        if (p >= 1) {
          this.advancePhase("done");
        }

        return state;
      }

      case "done":
        return {
          phase: "done",
          crossfader: 100,
          eqA: { hi: 50, mid: 50, lo: 50 },
          eqB: { hi: 50, mid: 50, lo: 50 },
          volA: 80,
          volB: 80,
          progress: 100,
          statusText: "Transition complete",
        };

      default:
        return {
          phase: "idle",
          crossfader: this.startCrossfader,
          eqA: { hi: 50, mid: 50, lo: 50 },
          eqB: { hi: 50, mid: 50, lo: 50 },
          volA: 80,
          volB: 80,
          progress: 0,
          statusText: "",
        };
    }
  }
}
