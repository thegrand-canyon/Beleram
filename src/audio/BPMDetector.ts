export function detectBPM(buffer: AudioBuffer): number {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;

  // Downsample to ~11025 Hz for efficiency
  const downsampleFactor = Math.floor(sampleRate / 11025);
  const downsampled: number[] = [];
  for (let i = 0; i < channelData.length; i += downsampleFactor) {
    downsampled.push(Math.abs(channelData[i]));
  }

  // Compute energy in windows
  const windowSize = 1024;
  const energies: number[] = [];
  for (let i = 0; i < downsampled.length; i += windowSize) {
    let energy = 0;
    const end = Math.min(i + windowSize, downsampled.length);
    for (let j = i; j < end; j++) {
      energy += downsampled[j] * downsampled[j];
    }
    energies.push(energy);
  }

  // Find peaks where energy exceeds local average
  const peaks: number[] = [];
  const localWindow = 10;
  for (let i = localWindow; i < energies.length - localWindow; i++) {
    let localAvg = 0;
    for (let j = i - localWindow; j < i + localWindow; j++) {
      localAvg += energies[j];
    }
    localAvg /= localWindow * 2;
    if (energies[i] > localAvg * 1.3) {
      peaks.push(i);
    }
  }

  if (peaks.length < 2) return 120; // fallback

  // Compute intervals between peaks
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }

  // Histogram to find mode interval
  const histogram = new Map<number, number>();
  intervals.forEach((interval) => {
    const quantized = Math.round(interval);
    histogram.set(quantized, (histogram.get(quantized) || 0) + 1);
  });

  let bestInterval = 0;
  let bestCount = 0;
  histogram.forEach((count, interval) => {
    if (count > bestCount) {
      bestCount = count;
      bestInterval = interval;
    }
  });

  if (bestInterval === 0) return 120; // fallback

  // Convert interval (in windows) to BPM
  const secondsPerWindow = windowSize / 11025;
  const secondsPerBeat = bestInterval * secondsPerWindow;
  let bpm = 60 / secondsPerBeat;

  // Normalize to 70-180 range
  while (bpm > 180) bpm /= 2;
  while (bpm < 70) bpm *= 2;

  return Math.round(bpm);
}
