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

/**
 * Score how well a candidate track follows a reference track.
 * Higher score = better match. Returns 0-100.
 *
 * Factors:
 *   Key compatibility (40 points) — harmonic mixing is most important
 *   BPM proximity (25 points)     — closer BPM = easier beatmatch
 *   Energy flow (20 points)       — smooth energy transitions (+/- 2 levels)
 *   Genre match (15 points)       — same genre blends better
 */
export const scoreTrackMatch = (reference: Track, candidate: Track): number => {
  let score = 0;

  // Key compatibility: 40 points
  const keyCompat = COMPATIBLE_KEYS[reference.key]?.includes(candidate.key);
  const sameKey = reference.key === candidate.key;
  if (sameKey) score += 40;
  else if (keyCompat) score += 30;
  // Relative major/minor gets partial credit even if not in compat list
  else score += 5;

  // BPM proximity: 25 points (0 diff = 25, 10+ diff = 0)
  const bpmDiff = Math.abs(reference.bpm - candidate.bpm);
  score += Math.max(0, 25 - bpmDiff * 2.5);

  // Energy flow: 20 points (best when energy changes by 0-2 levels)
  const energyDiff = Math.abs(reference.energy - candidate.energy);
  if (energyDiff <= 1) score += 20;
  else if (energyDiff <= 2) score += 15;
  else if (energyDiff <= 3) score += 8;
  else score += Math.max(0, 5 - energyDiff);

  // Genre match: 15 points
  if (reference.genre === candidate.genre) score += 15;
  else if (reference.genre.toLowerCase().includes(candidate.genre.split(" ")[0].toLowerCase()) ||
           candidate.genre.toLowerCase().includes(reference.genre.split(" ")[0].toLowerCase())) {
    score += 8; // Partial genre match (e.g., "House" in "Deep House")
  }

  return Math.round(Math.min(100, score));
};

/**
 * Get suggested next tracks, sorted by match score.
 * Excludes tracks already loaded on decks or in the queue.
 */
export const getSuggestedTracks = (
  reference: Track,
  allTracks: Track[],
  excludeIds: Set<string>,
  limit: number = 5,
): { track: Track; score: number; reasons: string[] }[] => {
  const scored = allTracks
    .filter((t) => !excludeIds.has(t.id))
    .map((t) => {
      const score = scoreTrackMatch(reference, t);
      const reasons: string[] = [];

      const keyCompat = COMPATIBLE_KEYS[reference.key]?.includes(t.key);
      const sameKey = reference.key === t.key;
      if (sameKey) reasons.push("Same key");
      else if (keyCompat) reasons.push("Key compatible");

      const bpmDiff = Math.abs(reference.bpm - t.bpm);
      if (bpmDiff === 0) reasons.push("Same BPM");
      else if (bpmDiff <= 3) reasons.push(`${bpmDiff > 0 ? "+" : ""}${t.bpm - reference.bpm} BPM`);

      if (reference.genre === t.genre) reasons.push("Same genre");

      const energyDiff = t.energy - reference.energy;
      if (energyDiff > 0 && energyDiff <= 2) reasons.push("Energy up");
      else if (energyDiff < 0 && energyDiff >= -2) reasons.push("Energy down");
      else if (energyDiff === 0) reasons.push("Same energy");

      return { track: t, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
};
