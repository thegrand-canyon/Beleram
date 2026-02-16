import { create } from "zustand";
import { Track, AutoDJMode, BottomTab, EQState, EffectParams, CrossfaderCurve, HistoryEntry } from "@/types";
import { DEMO_TRACKS } from "@/lib/constants";

const DEFAULT_EFFECT: EffectParams = { enabled: false, wetDry: 50, param: 50 };

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
  loopStartA: number | null;
  loopEndA: number | null;
  loopSizeA: number | null; // in beats (0.25, 0.5, 1, 2, 4, 8, 16)
  hotCuesA: (number | null)[];
  syncA: boolean;
  keyLockA: boolean;
  pflA: boolean;
  fxA: { filter: EffectParams; delay: EffectParams; reverb: EffectParams; flanger: EffectParams };
  setTrackA: (t: Track | null) => void;
  setPlayingA: (p: boolean) => void;
  setBpmA: (b: number) => void;
  setPosA: (p: number | ((prev: number) => number)) => void;
  setVolA: (v: number) => void;
  setEqA: (eq: EQState) => void;
  setLoopA: (l: boolean) => void;
  setLoopRegionA: (start: number | null, end: number | null) => void;
  setLoopSizeA: (size: number | null) => void;
  setHotCueA: (idx: number, pos: number | null) => void;
  setSyncA: (s: boolean) => void;
  setKeyLockA: (v: boolean) => void;
  setPflA: (v: boolean) => void;
  setFxA: (fx: Partial<{ filter: EffectParams; delay: EffectParams; reverb: EffectParams; flanger: EffectParams }>) => void;

  // Deck B
  trackB: Track | null;
  playingB: boolean;
  bpmB: number;
  posB: number;
  volB: number;
  eqB: EQState;
  loopB: boolean;
  loopStartB: number | null;
  loopEndB: number | null;
  loopSizeB: number | null;
  hotCuesB: (number | null)[];
  syncB: boolean;
  keyLockB: boolean;
  pflB: boolean;
  fxB: { filter: EffectParams; delay: EffectParams; reverb: EffectParams; flanger: EffectParams };
  setTrackB: (t: Track | null) => void;
  setPlayingB: (p: boolean) => void;
  setBpmB: (b: number) => void;
  setPosB: (p: number | ((prev: number) => number)) => void;
  setVolB: (v: number) => void;
  setEqB: (eq: EQState) => void;
  setLoopB: (l: boolean) => void;
  setLoopRegionB: (start: number | null, end: number | null) => void;
  setLoopSizeB: (size: number | null) => void;
  setHotCueB: (idx: number, pos: number | null) => void;
  setSyncB: (s: boolean) => void;
  setKeyLockB: (v: boolean) => void;
  setPflB: (v: boolean) => void;
  setFxB: (fx: Partial<{ filter: EffectParams; delay: EffectParams; reverb: EffectParams; flanger: EffectParams }>) => void;

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

  // Recording
  isRecording: boolean;
  setIsRecording: (v: boolean) => void;
  recordingTime: number;
  setRecordingTime: (v: number) => void;

  // UI
  showTips: boolean;
  setShowTips: (v: boolean) => void;
  activeTip: number;
  setActiveTip: (i: number) => void;
  bottomTab: BottomTab;
  setBottomTab: (t: BottomTab) => void;
  showAddTrack: boolean;
  setShowAddTrack: (v: boolean) => void;

  // Master
  masterVol: number;
  setMasterVol: (v: number) => void;
  crossfaderCurve: CrossfaderCurve;
  setCrossfaderCurve: (c: CrossfaderCurve) => void;

  // History
  history: HistoryEntry[];
  addToHistory: (track: Track, deck: "A" | "B") => void;
  clearHistory: () => void;

  // Track prep
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  trackTags: Record<string, string>;
  setTrackTag: (id: string, tag: string) => void;
  trackComments: Record<string, string>;
  setTrackComment: (id: string, comment: string) => void;

  // Autogain
  autogainA: boolean;
  autogainB: boolean;
  setAutogainA: (v: boolean) => void;
  setAutogainB: (v: boolean) => void;

  // Load track helpers
  loadTrack: (track: Track, deck: "A" | "B") => void;
}

const DEFAULT_FX = {
  filter: { ...DEFAULT_EFFECT },
  delay: { ...DEFAULT_EFFECT },
  reverb: { ...DEFAULT_EFFECT },
  flanger: { ...DEFAULT_EFFECT },
};

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
  loopStartA: null,
  loopEndA: null,
  loopSizeA: null,
  hotCuesA: [null, null, null, null],
  syncA: false,
  keyLockA: false,
  pflA: false,
  fxA: { ...DEFAULT_FX },
  setTrackA: (t) => set({ trackA: t }),
  setPlayingA: (p) => set({ playingA: p }),
  setBpmA: (b) => set({ bpmA: b }),
  setPosA: (p) => set((s) => ({ posA: typeof p === "function" ? p(s.posA) : p })),
  setVolA: (v) => set({ volA: v }),
  setEqA: (eq) => set({ eqA: eq }),
  setLoopA: (l) => set({ loopA: l }),
  setLoopRegionA: (start, end) => set({ loopStartA: start, loopEndA: end }),
  setLoopSizeA: (size) => set({ loopSizeA: size }),
  setHotCueA: (idx, pos) => set((s) => {
    const cues = [...s.hotCuesA];
    cues[idx] = pos;
    return { hotCuesA: cues };
  }),
  setSyncA: (s) => set({ syncA: s }),
  setKeyLockA: (v) => set({ keyLockA: v }),
  setPflA: (v) => set({ pflA: v }),
  setFxA: (fx) => set((s) => ({ fxA: { ...s.fxA, ...fx } })),

  // Deck B
  trackB: null,
  playingB: false,
  bpmB: 128,
  posB: 0,
  volB: 80,
  eqB: { hi: 50, mid: 50, lo: 50 },
  loopB: false,
  loopStartB: null,
  loopEndB: null,
  loopSizeB: null,
  hotCuesB: [null, null, null, null],
  syncB: false,
  keyLockB: false,
  pflB: false,
  fxB: { ...DEFAULT_FX },
  setTrackB: (t) => set({ trackB: t }),
  setPlayingB: (p) => set({ playingB: p }),
  setBpmB: (b) => set({ bpmB: b }),
  setPosB: (p) => set((s) => ({ posB: typeof p === "function" ? p(s.posB) : p })),
  setVolB: (v) => set({ volB: v }),
  setEqB: (eq) => set({ eqB: eq }),
  setLoopB: (l) => set({ loopB: l }),
  setLoopRegionB: (start, end) => set({ loopStartB: start, loopEndB: end }),
  setLoopSizeB: (size) => set({ loopSizeB: size }),
  setHotCueB: (idx, pos) => set((s) => {
    const cues = [...s.hotCuesB];
    cues[idx] = pos;
    return { hotCuesB: cues };
  }),
  setSyncB: (s) => set({ syncB: s }),
  setKeyLockB: (v) => set({ keyLockB: v }),
  setPflB: (v) => set({ pflB: v }),
  setFxB: (fx) => set((s) => ({ fxB: { ...s.fxB, ...fx } })),

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

  // Recording
  isRecording: false,
  setIsRecording: (v) => set({ isRecording: v }),
  recordingTime: 0,
  setRecordingTime: (v) => set({ recordingTime: v }),

  // UI
  showTips: false,
  setShowTips: (v) => set({ showTips: v }),
  activeTip: 0,
  setActiveTip: (i) => set({ activeTip: i }),
  bottomTab: "library",
  setBottomTab: (t) => set({ bottomTab: t }),
  showAddTrack: false,
  setShowAddTrack: (v) => set({ showAddTrack: v }),

  // Master
  masterVol: 80,
  setMasterVol: (v) => set({ masterVol: v }),
  crossfaderCurve: "smooth",
  setCrossfaderCurve: (c) => set({ crossfaderCurve: c }),

  // History
  history: [],
  addToHistory: (track, deck) => set((s) => ({
    history: [{ track, timestamp: Date.now(), deck }, ...s.history].slice(0, 50),
  })),
  clearHistory: () => set({ history: [] }),

  // Track prep
  favorites: new Set<string>(),
  toggleFavorite: (id) => set((s) => {
    const next = new Set(s.favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return { favorites: next };
  }),
  trackTags: {},
  setTrackTag: (id, tag) => set((s) => ({ trackTags: { ...s.trackTags, [id]: tag } })),
  trackComments: {},
  setTrackComment: (id, comment) => set((s) => ({ trackComments: { ...s.trackComments, [id]: comment } })),

  // Autogain
  autogainA: false,
  autogainB: false,
  setAutogainA: (v) => set({ autogainA: v }),
  setAutogainB: (v) => set({ autogainB: v }),

  // Load track
  loadTrack: (track, deck) => {
    const { addToHistory } = get();
    addToHistory(track, deck);
    if (deck === "A") {
      set({ trackA: track, bpmA: track.bpm, posA: 0, playingA: false, hotCuesA: [null, null, null, null], loopStartA: null, loopEndA: null, loopSizeA: null, loopA: false });
    } else {
      set({ trackB: track, bpmB: track.bpm, posB: 0, playingB: false, hotCuesB: [null, null, null, null], loopStartB: null, loopEndB: null, loopSizeB: null, loopB: false });
    }
  },
}));
