import { create } from "zustand";
import { Track, AutoDJMode, BottomTab, EQState } from "@/types";
import { DEMO_TRACKS } from "@/lib/constants";

interface DJStore {
  // Library
  tracks: Track[];
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  moveTrack: (idx: number, dir: number) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Queue
  queue: Track[];
  addToQueue: (track: Track) => void;
  removeFromQueue: (id: string) => void;
  moveInQueue: (idx: number, dir: number) => void;
  clearQueue: () => void;
  setQueue: (queue: Track[]) => void;
  shiftQueue: () => Track | undefined;

  // Deck A
  trackA: Track | null;
  playingA: boolean;
  bpmA: number;
  posA: number;
  volA: number;
  eqA: EQState;
  loopA: boolean;
  syncA: boolean;
  setTrackA: (t: Track | null) => void;
  setPlayingA: (p: boolean) => void;
  setBpmA: (b: number) => void;
  setPosA: (p: number | ((prev: number) => number)) => void;
  setVolA: (v: number) => void;
  setEqA: (eq: EQState) => void;
  setLoopA: (l: boolean) => void;
  setSyncA: (s: boolean) => void;

  // Deck B
  trackB: Track | null;
  playingB: boolean;
  bpmB: number;
  posB: number;
  volB: number;
  eqB: EQState;
  loopB: boolean;
  syncB: boolean;
  setTrackB: (t: Track | null) => void;
  setPlayingB: (p: boolean) => void;
  setBpmB: (b: number) => void;
  setPosB: (p: number | ((prev: number) => number)) => void;
  setVolB: (v: number) => void;
  setEqB: (eq: EQState) => void;
  setLoopB: (l: boolean) => void;
  setSyncB: (s: boolean) => void;

  // Mixer
  crossfader: number;
  setCrossfader: (v: number) => void;
  autoTrans: boolean;
  setAutoTrans: (v: boolean) => void;

  // Auto DJ
  autoDJ: boolean;
  setAutoDJ: (v: boolean) => void;
  autoDJMode: AutoDJMode;
  setAutoDJMode: (m: AutoDJMode) => void;
  autoDJStatus: string;
  setAutoDJStatus: (s: string) => void;
  transitionProgress: number;
  setTransitionProgress: (p: number) => void;

  // UI
  showTips: boolean;
  setShowTips: (v: boolean) => void;
  activeTip: number;
  setActiveTip: (i: number) => void;
  bottomTab: BottomTab;
  setBottomTab: (t: BottomTab) => void;
  showAddTrack: boolean;
  setShowAddTrack: (v: boolean) => void;

  // Load track helpers
  loadTrack: (track: Track, deck: "A" | "B") => void;
}

export const useDJStore = create<DJStore>((set, get) => ({
  // Library
  tracks: DEMO_TRACKS,
  addTrack: (track) => set((s) => ({ tracks: [...s.tracks, track] })),
  removeTrack: (id) =>
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== id),
      queue: s.queue.filter((t) => t.id !== id),
    })),
  moveTrack: (idx, dir) =>
    set((s) => {
      const newTracks = [...s.tracks];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= newTracks.length) return s;
      [newTracks[idx], newTracks[swapIdx]] = [newTracks[swapIdx], newTracks[idx]];
      return { tracks: newTracks };
    }),
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),

  // Queue
  queue: [],
  addToQueue: (track) =>
    set((s) => {
      if (s.queue.find((q) => q.id === track.id)) return s;
      return { queue: [...s.queue, track] };
    }),
  removeFromQueue: (id) => set((s) => ({ queue: s.queue.filter((q) => q.id !== id) })),
  moveInQueue: (idx, dir) =>
    set((s) => {
      const newQ = [...s.queue];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= newQ.length) return s;
      [newQ[idx], newQ[swapIdx]] = [newQ[swapIdx], newQ[idx]];
      return { queue: newQ };
    }),
  clearQueue: () => set({ queue: [] }),
  setQueue: (queue) => set({ queue }),
  shiftQueue: () => {
    const { queue } = get();
    if (queue.length === 0) return undefined;
    const first = queue[0];
    set({ queue: queue.slice(1) });
    return first;
  },

  // Deck A
  trackA: DEMO_TRACKS[0],
  playingA: false,
  bpmA: DEMO_TRACKS[0].bpm,
  posA: 0,
  volA: 80,
  eqA: { hi: 50, mid: 50, lo: 50 },
  loopA: false,
  syncA: false,
  setTrackA: (t) => set({ trackA: t }),
  setPlayingA: (p) => set({ playingA: p }),
  setBpmA: (b) => set({ bpmA: b }),
  setPosA: (p) => set((s) => ({ posA: typeof p === "function" ? p(s.posA) : p })),
  setVolA: (v) => set({ volA: v }),
  setEqA: (eq) => set({ eqA: eq }),
  setLoopA: (l) => set({ loopA: l }),
  setSyncA: (s) => set({ syncA: s }),

  // Deck B
  trackB: null,
  playingB: false,
  bpmB: 128,
  posB: 0,
  volB: 80,
  eqB: { hi: 50, mid: 50, lo: 50 },
  loopB: false,
  syncB: false,
  setTrackB: (t) => set({ trackB: t }),
  setPlayingB: (p) => set({ playingB: p }),
  setBpmB: (b) => set({ bpmB: b }),
  setPosB: (p) => set((s) => ({ posB: typeof p === "function" ? p(s.posB) : p })),
  setVolB: (v) => set({ volB: v }),
  setEqB: (eq) => set({ eqB: eq }),
  setLoopB: (l) => set({ loopB: l }),
  setSyncB: (s) => set({ syncB: s }),

  // Mixer
  crossfader: 0,
  setCrossfader: (v) => set({ crossfader: v }),
  autoTrans: false,
  setAutoTrans: (v) => set({ autoTrans: v }),

  // Auto DJ
  autoDJ: false,
  setAutoDJ: (v) => set({ autoDJ: v }),
  autoDJMode: "smart",
  setAutoDJMode: (m) => set({ autoDJMode: m }),
  autoDJStatus: "",
  setAutoDJStatus: (s) => set({ autoDJStatus: s }),
  transitionProgress: 0,
  setTransitionProgress: (p) => set({ transitionProgress: p }),

  // UI
  showTips: false,
  setShowTips: (v) => set({ showTips: v }),
  activeTip: 0,
  setActiveTip: (i) => set({ activeTip: i }),
  bottomTab: "library",
  setBottomTab: (t) => set({ bottomTab: t }),
  showAddTrack: false,
  setShowAddTrack: (v) => set({ showAddTrack: v }),

  // Load track
  loadTrack: (track, deck) => {
    if (deck === "A") {
      set({ trackA: track, bpmA: track.bpm, posA: 0, playingA: false });
    } else {
      set({ trackB: track, bpmB: track.bpm, posB: 0, playingB: false });
    }
  },
}));
