import { Track } from "@/types";
import { COMPATIBLE_KEYS } from "./constants";

export const isKeyCompatible = (keyA: string, keyB: string): boolean =>
  COMPATIBLE_KEYS[keyA]?.includes(keyB) ?? false;

export const generateFakeWaveform = (seed: number): number[] => {
  const points: number[] = [];
  let v = 0.5;
  for (let i = 0; i < 200; i++) {
    v += Math.sin(i * 0.1 + seed) * 0.3 + Math.cos(i * 0.05 + seed * 2) * 0.2 + (Math.random() - 0.5) * 0.15;
    v = Math.max(0.1, Math.min(1, v));
    points.push(v);
  }
  return points;
};

export const smartSortQueue = (queue: Track[], reference: Track): Track[] => {
  if (queue.length < 2) return queue;
  return [...queue].sort((a, b) => {
    const aKeyCompat = COMPATIBLE_KEYS[reference.key]?.includes(a.key) ? 1 : 0;
    const bKeyCompat = COMPATIBLE_KEYS[reference.key]?.includes(b.key) ? 1 : 0;
    if (aKeyCompat !== bKeyCompat) return bKeyCompat - aKeyCompat;
    return Math.abs(a.bpm - reference.bpm) - Math.abs(b.bpm - reference.bpm);
  });
};

export const filterTracks = (tracks: Track[], query: string): Track[] => {
  const q = query.toLowerCase();
  return tracks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.genre.toLowerCase().includes(q)
  );
};
