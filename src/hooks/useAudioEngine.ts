"use client";

import { useRef, useCallback } from "react";
import { AudioEngine } from "@/audio/AudioEngine";

let globalEngine: AudioEngine | null = null;

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(globalEngine);

  const getEngine = useCallback((): AudioEngine => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
      globalEngine = engineRef.current;
    }
    return engineRef.current;
  }, []);

  const ensureResumed = useCallback(async () => {
    const engine = getEngine();
    await engine.resume();
    return engine;
  }, [getEngine]);

  return { getEngine, ensureResumed, engine: engineRef.current };
}
