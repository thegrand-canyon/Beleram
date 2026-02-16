/**
 * RGB Waveform Analyzer — splits audio into bass/mid/hi frequency bands
 * and generates per-bar amplitude data for colored waveform rendering.
 *
 * Returns arrays for bass (red), mid (green), hi (blue) per bar.
 */

export interface RGBWaveformData {
  bass: number[];  // 0-1 per bar
  mid: number[];   // 0-1 per bar
  hi: number[];    // 0-1 per bar
}

export function generateRGBWaveformData(
  buffer: AudioBuffer,
  numBars: number = 200
): RGBWaveformData {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const fftSize = 2048;
  const samplesPerBar = Math.floor(channelData.length / numBars);

  const bass: number[] = [];
  const mid: number[] = [];
  const hi: number[] = [];

  // Frequency bin boundaries
  const bassMax = Math.floor(250 * fftSize / sampleRate);   // 0-250 Hz
  const midMax = Math.floor(4000 * fftSize / sampleRate);    // 250-4000 Hz
  // hi: 4000+ Hz

  for (let bar = 0; bar < numBars; bar++) {
    const start = bar * samplesPerBar;
    const segmentLen = Math.min(fftSize, samplesPerBar, channelData.length - start);

    // Simple energy calculation per frequency band using DFT-like approach
    // For efficiency, compute RMS in time-domain filtered bands
    let bassEnergy = 0;
    let midEnergy = 0;
    let hiEnergy = 0;
    let totalSamples = 0;

    // Use overlapping windows within this bar
    for (let offset = 0; offset + fftSize <= samplesPerBar && start + offset + fftSize <= channelData.length; offset += fftSize / 2) {
      const windowStart = start + offset;

      // Compute power spectrum using simple approach
      // We'll compute energy in approximate frequency ranges
      // Low-frequency energy: average of low-pass filtered signal
      let prevLow = 0;
      let prevHigh = 0;
      let bE = 0, mE = 0, hE = 0;

      const cutoffLow = 250 / sampleRate;   // normalized low cutoff
      const cutoffHigh = 4000 / sampleRate;  // normalized high cutoff
      const alphaLow = cutoffLow * 2 * Math.PI / (cutoffLow * 2 * Math.PI + 1);
      const alphaHigh = cutoffHigh * 2 * Math.PI / (cutoffHigh * 2 * Math.PI + 1);

      for (let i = 0; i < fftSize; i++) {
        const sample = channelData[windowStart + i] || 0;

        // Simple IIR low-pass for bass
        prevLow = prevLow + alphaLow * (sample - prevLow);
        const lowPart = prevLow;

        // Simple IIR high-pass for hi
        prevHigh = alphaHigh * (prevHigh + sample - (channelData[windowStart + i - 1] || 0));
        const hiPart = sample - prevLow; // everything above bass
        const midPart = hiPart - prevHigh; // mid = total - bass - hi

        bE += lowPart * lowPart;
        mE += midPart * midPart;
        hE += prevHigh * prevHigh;
      }

      bassEnergy += Math.sqrt(bE / fftSize);
      midEnergy += Math.sqrt(mE / fftSize);
      hiEnergy += Math.sqrt(hE / fftSize);
      totalSamples++;
    }

    if (totalSamples === 0) {
      // Fallback: just compute overall RMS
      let sum = 0;
      for (let i = start; i < start + samplesPerBar && i < channelData.length; i++) {
        sum += Math.abs(channelData[i]);
      }
      const avg = sum / samplesPerBar;
      bass.push(avg);
      mid.push(avg);
      hi.push(avg);
    } else {
      bass.push(bassEnergy / totalSamples);
      mid.push(midEnergy / totalSamples);
      hi.push(hiEnergy / totalSamples);
    }
  }

  // Normalize each band independently to 0-1
  const normalize = (arr: number[]): number[] => {
    const max = Math.max(...arr);
    if (max === 0) return arr.map(() => 0.05);
    return arr.map(v => Math.max(0.02, v / max));
  };

  return {
    bass: normalize(bass),
    mid: normalize(mid),
    hi: normalize(hi),
  };
}
