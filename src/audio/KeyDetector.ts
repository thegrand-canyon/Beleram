/**
 * Key detection using chromagram analysis.
 * Analyzes audio to detect the musical key using pitch class profiles.
 */

// Krumhansl-Kessler key profiles
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

// Map to Camelot wheel notation
const CAMELOT_MAP: Record<string, string> = {
  "C major": "8B", "G major": "9B", "D major": "10B", "A major": "11B",
  "E major": "12B", "B major": "1B", "F# major": "2B", "Db major": "3B",
  "Ab major": "4B", "Eb major": "5B", "Bb major": "6B", "F major": "7B",
  "A minor": "8A", "E minor": "9A", "B minor": "10A", "F# minor": "11A",
  "Db minor": "12A", "Ab minor": "1A", "Eb minor": "2A", "Bb minor": "3A",
  "F minor": "4A", "C minor": "5A", "G minor": "6A", "D minor": "7A",
};

function correlate(chromagram: number[], profile: number[]): number {
  const n = 12;
  let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumXY += chromagram[i] * profile[i];
    sumX += chromagram[i];
    sumY += profile[i];
    sumX2 += chromagram[i] * chromagram[i];
    sumY2 += profile[i] * profile[i];
  }
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

function rotateArray(arr: number[], n: number): number[] {
  const len = arr.length;
  const offset = ((n % len) + len) % len;
  return [...arr.slice(offset), ...arr.slice(0, offset)];
}

export function detectKey(buffer: AudioBuffer): string {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);

  // Use a segment from the middle of the track (more representative)
  const segmentDuration = Math.min(30, buffer.duration);
  const startSample = Math.floor(Math.max(0, (buffer.duration / 2 - segmentDuration / 2)) * sampleRate);
  const numSamples = Math.floor(segmentDuration * sampleRate);
  const endSample = Math.min(startSample + numSamples, channelData.length);

  // Build chromagram using simple DFT at each pitch frequency
  const chromagram = new Float64Array(12);
  const fftSize = 8192;
  const hopSize = fftSize / 2;

  // Reference frequencies for each pitch class (octave 4)
  const baseFreqs = Array.from({ length: 12 }, (_, i) => 261.63 * Math.pow(2, i / 12)); // C4 to B4

  for (let pos = startSample; pos + fftSize < endSample; pos += hopSize) {
    // Apply Hanning window and compute energy at each pitch class
    for (let pc = 0; pc < 12; pc++) {
      // Check multiple octaves
      for (let octave = -2; octave <= 2; octave++) {
        const freq = baseFreqs[pc] * Math.pow(2, octave);
        if (freq < 50 || freq > sampleRate / 2) continue;

        // Goertzel algorithm for single-frequency DFT
        const k = Math.round(freq * fftSize / sampleRate);
        const w = (2 * Math.PI * k) / fftSize;
        const cosW = Math.cos(w);
        const sinW = Math.sin(w);
        let s0 = 0, s1 = 0, s2 = 0;

        for (let i = 0; i < fftSize; i++) {
          const sample = channelData[pos + i] || 0;
          // Hanning window
          const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
          s0 = sample * window + 2 * cosW * s1 - s2;
          s2 = s1;
          s1 = s0;
        }

        const real = s1 - s2 * cosW;
        const imag = s2 * sinW;
        const magnitude = Math.sqrt(real * real + imag * imag);
        chromagram[pc] += magnitude;
      }
    }
  }

  // Normalize chromagram
  const maxVal = Math.max(...chromagram);
  if (maxVal === 0) return "Am"; // fallback
  const normalized = Array.from(chromagram).map(v => v / maxVal);

  // Correlate with all 24 major and minor key profiles
  let bestKey = "C major";
  let bestCorrelation = -Infinity;

  for (let i = 0; i < 12; i++) {
    const majorCorr = correlate(rotateArray(normalized, i), MAJOR_PROFILE);
    const minorCorr = correlate(rotateArray(normalized, i), MINOR_PROFILE);

    const majorKey = `${NOTE_NAMES[i]} major`;
    const minorKey = `${NOTE_NAMES[i]} minor`;

    if (majorCorr > bestCorrelation) {
      bestCorrelation = majorCorr;
      bestKey = majorKey;
    }
    if (minorCorr > bestCorrelation) {
      bestCorrelation = minorCorr;
      bestKey = minorKey;
    }
  }

  // Return in Camelot notation if available, otherwise musical notation
  return CAMELOT_MAP[bestKey] || bestKey.replace(" major", "").replace(" minor", "m");
}
