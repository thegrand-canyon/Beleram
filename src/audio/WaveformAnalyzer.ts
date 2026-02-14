export function generateWaveformData(
  buffer: AudioBuffer,
  numBars: number = 200
): number[] {
  const channelData = buffer.getChannelData(0);
  const samplesPerBar = Math.floor(channelData.length / numBars);
  const waveform: number[] = [];

  for (let i = 0; i < numBars; i++) {
    let sum = 0;
    const start = i * samplesPerBar;
    const end = Math.min(start + samplesPerBar, channelData.length);
    for (let j = start; j < end; j++) {
      sum += Math.abs(channelData[j]);
    }
    waveform.push(sum / samplesPerBar);
  }

  // Normalize to 0-1
  const max = Math.max(...waveform);
  if (max === 0) return waveform.map(() => 0.1);
  return waveform.map((v) => Math.max(0.05, v / max));
}
