"use client";

import { useState, useCallback } from "react";
import { Track } from "@/types";
import { AudioEngine } from "@/audio/AudioEngine";
import { generateWaveformData } from "@/audio/WaveformAnalyzer";
import { generateRGBWaveformData } from "@/audio/RGBWaveformAnalyzer";
import { detectBPM } from "@/audio/BPMDetector";
import { detectKey } from "@/audio/KeyDetector";

export function useFileUpload(getEngine: () => AudioEngine) {
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(
    async (file: File): Promise<Track> => {
      setLoading(true);
      try {
        const engine = getEngine();
        await engine.resume();
        const audioBuffer = await engine.decodeFile(file);
        const waveformData = generateWaveformData(audioBuffer);
        const rgbWaveformData = generateRGBWaveformData(audioBuffer);
        const bpm = detectBPM(audioBuffer);
        const key = detectKey(audioBuffer);

        return {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: file.name.replace(/\.(mp3|wav|ogg|flac|m4a|aac|wma)$/i, ""),
          artist: "Unknown",
          bpm,
          key,
          duration: audioBuffer.duration,
          genre: "Unknown",
          energy: 5,
          source: "local",
          audioBuffer,
          waveformData,
          rgbWaveformData,
        };
      } finally {
        setLoading(false);
      }
    },
    [getEngine]
  );

  return { processFile, loading };
}
