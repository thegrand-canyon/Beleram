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
}

export interface EQState {
  hi: number;
  mid: number;
  lo: number;
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

export type AutoDJMode = "smooth" | "party" | "chill" | "build";
export type BottomTab = "library" | "queue" | "spotify" | "guide";
