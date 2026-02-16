import { RGBWaveformData } from "@/audio/RGBWaveformAnalyzer";

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  duration: number;
  genre: string;
  energy: number;
  source: "local" | "spotify" | "demo";
  audioBuffer?: AudioBuffer;
  spotifyUri?: string;
  waveformData?: number[];
  rgbWaveformData?: RGBWaveformData;
}

export interface EQState {
  hi: number;
  mid: number;
  lo: number;
}

export interface EffectParams {
  enabled: boolean;
  wetDry: number; // 0-100
  param: number;  // 0-100
}

export interface DeckState {
  track: Track | null;
  playing: boolean;
  position: number;
  bpm: number;
  volume: number;
  eq: EQState;
  loop: boolean;
  synced: boolean;
}

export type AutoDJMode = "smart" | "smooth" | "drop" | "long" | "echo" | "party";
export type BottomTab = "library" | "queue" | "spotify" | "guide";
