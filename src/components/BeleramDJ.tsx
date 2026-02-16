"use client";

import { useEffect, useRef, useCallback } from "react";
import { useDJStore } from "@/stores/djStore";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useFileUpload } from "@/hooks/useFileUpload";
import { SmartTransition } from "@/audio/SmartTransition";
import Header from "./Header";
import TipsBar from "./TipsBar";
import Deck from "./Deck";
import Crossfader from "./Crossfader";
import AutoDJPanel from "./AutoDJ";
import TrackLibrary from "./TrackLibrary";
import Queue from "./Queue";
import Guide from "./Guide";
import FileDropZone from "./FileDropZone";
import SpotifyBrowser from "./SpotifyBrowser";
import SamplePads from "./SamplePads";
import RecordButton from "./RecordButton";
import MasterControls from "./MasterControls";
import History from "./History";

export default function BeleramDJ() {
  const store = useDJStore();
  const { getEngine, ensureResumed } = useAudioEngine();
  const { processFile, loading: fileLoading } = useFileUpload(getEngine);
  const engineInitialized = useRef(false);

  // Initialize audio engine on first interaction
  const handleFirstInteraction = useCallback(async () => {
    if (engineInitialized.current) return;
    engineInitialized.current = true;
    await ensureResumed();
  }, [ensureResumed]);

  // Sync audio engine with store state
  useEffect(() => {
    const engine = getEngine();
    engine.setCrossfade(store.crossfader);
    engine.deckA.setVolume(store.volA);
    engine.deckB.setVolume(store.volB);
    engine.deckA.setEqHi(store.eqA.hi);
    engine.deckA.setEqMid(store.eqA.mid);
    engine.deckA.setEqLo(store.eqA.lo);
    engine.deckB.setEqHi(store.eqB.hi);
    engine.deckB.setEqMid(store.eqB.mid);
    engine.deckB.setEqLo(store.eqB.lo);
  }, [store.crossfader, store.volA, store.volB, store.eqA, store.eqB, getEngine]);

  // Handle play/pause for deck A
  useEffect(() => {
    const engine = getEngine();
    const deck = engine.deckA;
    const s = useDJStore.getState();
    if (s.trackA?.audioBuffer && s.playingA && !deck.playing) {
      engine.resume().then(() => {
        const current = useDJStore.getState();
        if (!current.trackA?.audioBuffer || !current.playingA) return;
        if (!deck.buffer || deck.buffer !== current.trackA.audioBuffer) {
          // Load buffer at the current store position (important for deck swaps)
          deck.loadBuffer(current.trackA.audioBuffer, current.posA);
        }
        deck.play();
      });
    } else if (!s.playingA && deck.playing) {
      deck.pause();
    }
  }, [store.playingA, store.trackA, getEngine]);

  // Handle play/pause for deck B
  useEffect(() => {
    const engine = getEngine();
    const deck = engine.deckB;
    const s = useDJStore.getState();
    if (s.trackB?.audioBuffer && s.playingB && !deck.playing) {
      engine.resume().then(() => {
        const current = useDJStore.getState();
        if (!current.trackB?.audioBuffer || !current.playingB) return;
        if (!deck.buffer || deck.buffer !== current.trackB.audioBuffer) {
          deck.loadBuffer(current.trackB.audioBuffer, current.posB);
        }
        deck.play();
      });
    } else if (!s.playingB && deck.playing) {
      deck.pause();
    }
  }, [store.playingB, store.trackB, getEngine]);

  // Sync BPM via playback rate
  useEffect(() => {
    const engine = getEngine();
    if (store.trackA?.audioBuffer) {
      const rate = store.bpmA / (store.trackA.bpm || store.bpmA);
      engine.deckA.setPlaybackRate(rate);
    }
  }, [store.bpmA, store.trackA, getEngine]);

  useEffect(() => {
    const engine = getEngine();
    if (store.trackB?.audioBuffer) {
      const rate = store.bpmB / (store.trackB.bpm || store.bpmB);
      engine.deckB.setPlaybackRate(rate);
    }
  }, [store.bpmB, store.trackB, getEngine]);

  // Update positions from audio engine — handles loops, track end, and engine desync
  useEffect(() => {
    const engine = getEngine();
    let raf: number;
    const tick = () => {
      const s = useDJStore.getState();

      // --- Deck A ---
      if (s.trackA?.audioBuffer) {
        if (engine.deckA.playing) {
          const pos = engine.deckA.currentTime;

          // Loop enforcement for real audio
          if (s.loopA && s.loopStartA != null && s.loopEndA != null) {
            const loopEndTime = s.loopEndA * s.trackA.duration;
            const loopStartTime = s.loopStartA * s.trackA.duration;
            if (pos >= loopEndTime) {
              engine.deckA.seek(loopStartTime);
              s.setPosA(loopStartTime);
            } else {
              s.setPosA(pos);
            }
          } else if (pos >= s.trackA.duration - 0.2) {
            // Track ended — use generous margin to avoid missing it
            s.setPlayingA(false);
            s.setPosA(0);
            engine.deckA.stop();
          } else {
            s.setPosA(pos);
          }
        } else if (s.playingA && !engine.deckA.playing) {
          // Engine stopped but store thinks it's playing — desync fix
          // This happens when AudioBufferSourceNode fires onended
          s.setPlayingA(false);
        }
      }

      // --- Deck B ---
      if (s.trackB?.audioBuffer) {
        if (engine.deckB.playing) {
          const pos = engine.deckB.currentTime;

          // Loop enforcement for real audio
          if (s.loopB && s.loopStartB != null && s.loopEndB != null) {
            const loopEndTime = s.loopEndB * s.trackB.duration;
            const loopStartTime = s.loopStartB * s.trackB.duration;
            if (pos >= loopEndTime) {
              engine.deckB.seek(loopStartTime);
              s.setPosB(loopStartTime);
            } else {
              s.setPosB(pos);
            }
          } else if (pos >= s.trackB.duration - 0.2) {
            s.setPlayingB(false);
            s.setPosB(0);
            engine.deckB.stop();
          } else {
            s.setPosB(pos);
          }
        } else if (s.playingB && !engine.deckB.playing) {
          s.setPlayingB(false);
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getEngine]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "SELECT") return;

      const s = useDJStore.getState();
      if (s.autoTrans && (e.key === " " || e.key.toLowerCase() === "b")) return;

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          s.setPlayingA(!s.playingA);
          break;
        case "b":
          s.setPlayingB(!s.playingB);
          break;
        case "arrowleft":
          e.preventDefault();
          s.setCrossfader(Math.max(0, s.crossfader - 5));
          break;
        case "arrowright":
          e.preventDefault();
          s.setCrossfader(Math.min(100, s.crossfader + 5));
          break;
        case "s":
          s.setSyncB(!s.syncB);
          break;
        case "q":
          s.setLoopA(!s.loopA);
          break;
        case "l":
          s.setLoopB(!s.loopB);
          break;
        case "1": case "2": case "3": case "4": {
          const idx = parseInt(e.key) - 1;
          if (s.trackA) {
            if (s.hotCuesA[idx] != null) {
              s.setPosA(s.hotCuesA[idx]! * s.trackA.duration);
            } else {
              s.setHotCueA(idx, s.posA / s.trackA.duration);
            }
          }
          break;
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Auto transition engine
  const transStartTime = useRef<number>(0);
  const smartTransRef = useRef<SmartTransition | null>(null);
  useEffect(() => {
    if (!store.autoTrans) {
      smartTransRef.current = null;
      return;
    }

    const mode = store.autoDJMode;
    const startCrossfader = useDJStore.getState().crossfader;

    const finishTransition = (s: ReturnType<typeof useDJStore.getState>) => {
      s.setAutoTrans(false);
      s.setTransitionProgress(0);
      s.setCrossfader(100);
      s.setEqA({ hi: 50, mid: 50, lo: 50 });
      s.setEqB({ hi: 50, mid: 50, lo: 50 });
      s.setVolA(80);
      s.setVolB(80);
      smartTransRef.current = null;
    };

    if (mode === "smart") {
      const engine = getEngine();
      const bpm = useDJStore.getState().bpmA || 128;
      smartTransRef.current = new SmartTransition(engine.deckA, engine.deckB, bpm, startCrossfader);

      const interval = setInterval(() => {
        const s = useDJStore.getState();
        const smart = smartTransRef.current;
        if (!smart) return;

        const state = smart.tick();
        s.setCrossfader(state.crossfader);
        s.setEqA(state.eqA);
        s.setEqB(state.eqB);
        s.setVolA(state.volA);
        s.setVolB(state.volB);
        s.setTransitionProgress(state.progress);
        s.setAutoDJStatus(`${state.statusText}`);

        if (state.phase === "done") finishTransition(s);
      }, 50);
      return () => clearInterval(interval);
    }

    const duration = mode === "party" ? 12 : mode === "drop" ? 20 : mode === "long" ? 45 : mode === "echo" ? 18 : 24;
    transStartTime.current = Date.now();

    const interval = setInterval(() => {
      const s = useDJStore.getState();
      const elapsed = (Date.now() - transStartTime.current) / 1000;
      const t = Math.min(1, elapsed / duration);

      if (mode === "smooth") {
        const eased = 0.5 - 0.5 * Math.cos(t * Math.PI);
        const cf = startCrossfader + (100 - startCrossfader) * eased;
        s.setCrossfader(cf);
        if (t < 0.3) {
          const p = t / 0.3;
          s.setEqB({ hi: Math.round(20 + 30 * p), mid: Math.round(10 + 15 * p), lo: 5 });
          s.setEqA({ hi: 50, mid: 50, lo: 50 });
        } else if (t < 0.5) {
          const p = (t - 0.3) / 0.2;
          s.setEqB({ hi: 50, mid: Math.round(25 + 25 * p), lo: Math.round(5 + 10 * p) });
          s.setEqA({ hi: 50, mid: 50, lo: 50 });
        } else if (t < 0.65) {
          const p = (t - 0.5) / 0.15;
          const swapCurve = 0.5 - 0.5 * Math.cos(p * Math.PI);
          s.setEqA({ hi: 50, mid: 50, lo: Math.round(50 - 45 * swapCurve) });
          s.setEqB({ hi: 50, mid: 50, lo: Math.round(15 + 35 * swapCurve) });
        } else {
          const p = (t - 0.65) / 0.35;
          const fadeOut = 0.5 + 0.5 * Math.cos(p * Math.PI);
          s.setEqA({ hi: Math.round(50 * fadeOut), mid: Math.round(50 * fadeOut), lo: 5 });
          s.setEqB({ hi: 50, mid: 50, lo: 50 });
        }
      } else if (mode === "drop") {
        if (t < 0.6) {
          const p = t / 0.6;
          s.setEqA({ hi: 50, mid: Math.round(50 - 30 * p), lo: Math.round(50 - 45 * p) });
          s.setEqB({ hi: Math.round(15 + 10 * p), mid: 5, lo: 0 });
          s.setCrossfader(startCrossfader + 20 * p);
          s.setVolB(Math.round(20 + 15 * p));
        } else if (t < 0.8) {
          const p = (t - 0.6) / 0.2;
          s.setEqA({ hi: Math.round(40 - 20 * p), mid: Math.round(20 - 15 * p), lo: 5 });
          s.setEqB({ hi: Math.round(25 + 10 * p), mid: Math.round(5 + 10 * p), lo: 0 });
          s.setCrossfader(startCrossfader + 20 + 15 * p);
          s.setVolB(Math.round(35 + 10 * p));
        } else if (t < 0.85) {
          const p = (t - 0.8) / 0.05;
          s.setEqA({ hi: Math.round(20 - 15 * p), mid: 5, lo: 5 });
          s.setEqB({ hi: Math.round(35 - 20 * p), mid: Math.round(15 - 10 * p), lo: 0 });
          s.setVolA(Math.round(80 - 50 * p));
          s.setVolB(Math.round(45 - 20 * p));
          s.setCrossfader(startCrossfader + 35 + 5 * p);
        } else {
          const p = (t - 0.85) / 0.15;
          const snap = Math.min(1, p * 3);
          s.setCrossfader(startCrossfader + 40 + 60 * snap);
          s.setVolA(Math.round(30 * (1 - snap)));
          s.setVolB(80);
          s.setEqA({ hi: Math.round(5 * (1 - snap)), mid: 5, lo: 5 });
          s.setEqB({ hi: 50, mid: 50, lo: 50 });
        }
      } else if (mode === "long") {
        const eased = t * t * (3 - 2 * t);
        const cf = startCrossfader + (100 - startCrossfader) * eased;
        s.setCrossfader(cf);
        if (t < 0.2) {
          const p = t / 0.2;
          s.setEqB({ hi: Math.round(10 + 20 * p), mid: Math.round(5 + 10 * p), lo: 0 });
          s.setEqA({ hi: 50, mid: 50, lo: 50 });
        } else if (t < 0.4) {
          const p = (t - 0.2) / 0.2;
          s.setEqB({ hi: Math.round(30 + 10 * p), mid: Math.round(15 + 20 * p), lo: Math.round(5 * p) });
          s.setEqA({ hi: 50, mid: 50, lo: 50 });
        } else if (t < 0.55) {
          const p = (t - 0.4) / 0.15;
          const curve = 0.5 - 0.5 * Math.cos(p * Math.PI);
          s.setEqA({ hi: 50, mid: 50, lo: Math.round(50 - 40 * curve) });
          s.setEqB({ hi: 40, mid: 35, lo: Math.round(5 + 45 * curve) });
        } else if (t < 0.75) {
          const p = (t - 0.55) / 0.2;
          s.setEqA({ hi: Math.round(50 - 15 * p), mid: Math.round(50 - 15 * p), lo: 10 });
          s.setEqB({ hi: 50, mid: 50, lo: 50 });
        } else {
          const p = (t - 0.75) / 0.25;
          const fade = 0.5 + 0.5 * Math.cos(p * Math.PI);
          s.setEqA({ hi: Math.round(35 * fade), mid: Math.round(35 * fade), lo: Math.round(10 * fade) });
          s.setEqB({ hi: 50, mid: 50, lo: 50 });
        }
      } else if (mode === "echo") {
        if (t < 0.3) {
          const p = t / 0.3;
          s.setCrossfader(startCrossfader + 15 * p);
          s.setEqB({ hi: Math.round(15 + 20 * p), mid: Math.round(5 + 10 * p), lo: 0 });
          s.setEqA({ hi: 50, mid: 50, lo: 50 });
        } else if (t < 0.5) {
          const p = (t - 0.3) / 0.2;
          s.setCrossfader(startCrossfader + 15 + 20 * p);
          s.setEqA({ hi: Math.round(50 + 10 * Math.sin(p * Math.PI)), mid: Math.round(50 - 25 * p), lo: Math.round(50 - 40 * p) });
          s.setEqB({ hi: Math.round(35 + 15 * p), mid: Math.round(15 + 20 * p), lo: Math.round(5 + 15 * p) });
        } else if (t < 0.75) {
          const p = (t - 0.5) / 0.25;
          s.setCrossfader(startCrossfader + 35 + 35 * p);
          s.setEqA({ hi: Math.round(60 - 40 * p), mid: Math.round(25 - 20 * p), lo: Math.round(10 - 8 * p) });
          s.setVolA(Math.round(80 - 40 * p));
          const curve = 0.5 - 0.5 * Math.cos(p * Math.PI);
          s.setEqB({ hi: 50, mid: Math.round(35 + 15 * curve), lo: Math.round(20 + 30 * curve) });
        } else {
          const p = (t - 0.75) / 0.25;
          s.setCrossfader(startCrossfader + 70 + 30 * p);
          const fade = 1 - p;
          s.setEqA({ hi: Math.round(20 * fade), mid: Math.round(5 * fade), lo: 2 });
          s.setVolA(Math.round(40 * fade * fade));
          s.setEqB({ hi: 50, mid: 50, lo: 50 });
        }
      } else {
        // party / quick mix
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const cf = startCrossfader + (100 - startCrossfader) * eased;
        s.setCrossfader(cf);
        if (t < 0.25) {
          const p = t / 0.25;
          s.setEqB({ hi: Math.round(30 + 20 * p), mid: Math.round(20 + 15 * p), lo: 10 });
          s.setEqA({ hi: 50, mid: 50, lo: 50 });
        } else if (t < 0.5) {
          const p = (t - 0.25) / 0.25;
          const swapCurve = 0.5 - 0.5 * Math.cos(p * Math.PI);
          s.setEqA({ hi: 50, mid: 50, lo: Math.round(50 - 45 * swapCurve) });
          s.setEqB({ hi: 50, mid: Math.round(35 + 15 * swapCurve), lo: Math.round(10 + 40 * swapCurve) });
        } else {
          const p = (t - 0.5) / 0.5;
          const fadeOut = Math.cos(p * Math.PI / 2);
          s.setEqA({ hi: Math.round(50 * fadeOut), mid: Math.round(50 * fadeOut), lo: 5 });
          s.setEqB({ hi: 50, mid: 50, lo: 50 });
        }
      }

      if (t >= 1) {
        finishTransition(s);
      } else {
        s.setTransitionProgress(t * 100);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [store.autoTrans, store.autoDJMode, getEngine]);

  // Auto DJ engine
  const transitionQueued = useRef(false);
  useEffect(() => {
    if (!store.autoDJ) {
      transitionQueued.current = false;
      return;
    }
    const interval = setInterval(() => {
      const s = useDJStore.getState();
      const triggerPoint = s.autoDJMode === "smart" ? 0.50 : s.autoDJMode === "long" ? 0.55 : s.autoDJMode === "smooth" ? 0.65 : 0.70;
      const leadIn = s.autoDJMode === "smart" ? 3000 : s.autoDJMode === "long" ? 4000 : s.autoDJMode === "drop" ? 3000 : 2000;

      if (s.trackA && s.posA > s.trackA.duration * triggerPoint && !s.autoTrans && s.crossfader < 50 && !transitionQueued.current) {
        if (s.queue.length > 0 && !s.trackB) {
          transitionQueued.current = true;
          const next = s.shiftQueue();
          if (next) {
            // Pre-load the buffer into the audio engine before setting store state
            if (next.audioBuffer) {
              const engine = getEngine();
              engine.deckB.loadBuffer(next.audioBuffer, 0);
            }
            s.setTrackB(next);
            s.setBpmB(next.bpm);
            s.setPosB(0);
            s.setPlayingB(true);
            s.setSyncB(true);
            s.setAutoDJStatus(`Cueing "${next.title}" into Deck B...`);
            setTimeout(() => {
              const ss = useDJStore.getState();
              ss.setAutoTrans(true);
              const modeLabel = ss.autoDJMode === "smart" ? "Smart mix" : ss.autoDJMode === "drop" ? "Drop cut" : ss.autoDJMode === "long" ? "Long mix" : ss.autoDJMode === "echo" ? "Echo fade" : ss.autoDJMode === "party" ? "Quick mix" : "Smooth blend";
              ss.setAutoDJStatus(`${modeLabel} → "${next.title}"`);
            }, leadIn);
          }
        }
      }
      if (s.crossfader >= 95 && s.trackB && !s.autoTrans) {
        const engine = getEngine();

        // Capture everything from deck B before we clear it
        const trackB = s.trackB;
        const bpmB = s.bpmB;
        const currentPosB = engine.deckB.playing ? engine.deckB.currentTime : s.posB;

        // 1. Stop deck A audio (old track is done)
        engine.deckA.stop();

        // 2. Stop deck B audio (we're moving it to A)
        engine.deckB.pause();

        // 3. Load deck B's audio into deck A at the correct position
        if (trackB.audioBuffer) {
          engine.deckA.loadBuffer(trackB.audioBuffer, currentPosB);
          const rate = bpmB / (trackB.bpm || bpmB);
          engine.deckA.setPlaybackRate(rate);
          engine.deckA.play();
        }

        // 4. Reset crossfader to A side before setting store state
        engine.setCrossfade(0);

        // 5. Update all store state
        s.setPlayingB(false);
        s.setTrackA(trackB);
        s.setBpmA(bpmB);
        s.setPosA(currentPosB);
        s.setPlayingA(true);
        s.setTrackB(null);
        s.setPosB(0);
        s.setCrossfader(0);
        s.setSyncB(false);
        s.setVolA(80);
        s.setVolB(80);
        s.setEqA({ hi: 50, mid: 50, lo: 50 });
        s.setEqB({ hi: 50, mid: 50, lo: 50 });

        s.setAutoDJStatus(`Now playing: "${trackB.title}"`);
        transitionQueued.current = false;
      }
    }, 500);
    return () => clearInterval(interval);
  }, [store.autoDJ, getEngine]);

  // File drop handler
  const handleFilesDropped = useCallback(
    async (files: File[]) => {
      await handleFirstInteraction();
      for (const file of files) {
        const track = await processFile(file);
        store.addTrack(track);
      }
    },
    [processFile, store, handleFirstInteraction]
  );

  // Track drag-to-deck handler
  const handleTrackDropToDeck = useCallback(
    (trackId: string, deck: "A" | "B") => {
      const track = useDJStore.getState().tracks.find((t) => t.id === trackId);
      if (track) store.loadTrack(track, deck);
    },
    [store]
  );

  return (
    <div
      onClick={handleFirstInteraction}
      style={{
        minHeight: "100vh", background: "linear-gradient(160deg, #0a0a18 0%, #0f0f24 40%, #0a0a1a 100%)",
        fontFamily: "'Outfit', sans-serif", color: "#e0e0e0", display: "flex", flexDirection: "column",
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        input[type="range"] { -webkit-appearance: none; background: rgba(255,255,255,0.08); border-radius: 4px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 4px; background: #8866ff; cursor: pointer; border: 2px solid #aa88ff; box-shadow: 0 0 10px #8866ff44; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 8px #8866ff33; } 50% { box-shadow: 0 0 20px #8866ff55; } }
        @keyframes recPulse { 0%,100% { opacity: 0.7; } 50% { opacity: 1; box-shadow: 0 0 12px #ff333366; } }
        @media (max-width: 1200px) {
          .beleram-decks { flex-direction: column !important; }
          .beleram-center { flex-direction: row !important; min-width: unset !important; flex-wrap: wrap; justify-content: center; }
        }
        @media (max-width: 768px) {
          .beleram-main { padding: 10px 8px 0 !important; }
          .beleram-bottom-tabs { flex-wrap: wrap; }
        }
      `}</style>

      <Header />

      {/* Auto DJ Status Banner */}
      {store.autoDJStatus && (
        <div style={{ margin: "8px 20px 0", padding: "8px 14px", borderRadius: 8, background: "linear-gradient(90deg, #8866ff10, #00f0ff10)", border: "1px solid #8866ff22", display: "flex", alignItems: "center", gap: 8, animation: "slideUp 0.2s ease-out" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#8866ff", animation: "pulse 1s infinite" }} />
          <span style={{ fontSize: 11, color: "#aaa", fontFamily: "'JetBrains Mono', monospace" }}>{store.autoDJStatus}</span>
          {store.autoTrans && (
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginLeft: 8, overflow: "hidden" }}>
              <div style={{ width: `${store.transitionProgress}%`, height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #00f0ff, #ff6ec7)", transition: "width 0.1s" }} />
            </div>
          )}
        </div>
      )}

      <TipsBar />

      {/* Main DJ Area */}
      <div className="beleram-main" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 20px 0", gap: 10 }}>
        {/* Decks */}
        <div className="beleram-decks" style={{ display: "flex", gap: 10 }}>
          <Deck
            side="A" track={store.trackA} playing={store.playingA} setPlaying={store.setPlayingA}
            bpm={store.bpmA} setBpm={store.setBpmA} position={store.posA} setPosition={store.setPosA}
            volume={store.volA} setVolume={store.setVolA} eq={store.eqA} setEq={store.setEqA}
            loop={store.loopA} setLoop={store.setLoopA}
            loopStart={store.loopStartA} loopEnd={store.loopEndA} setLoopRegion={store.setLoopRegionA}
            loopSize={store.loopSizeA} setLoopSize={store.setLoopSizeA}
            hotCues={store.hotCuesA} setHotCue={store.setHotCueA}
            otherTrack={store.trackB}
            synced={store.syncA} setSynced={store.setSyncA} otherBpm={store.bpmB}
            keyLock={store.keyLockA} setKeyLock={store.setKeyLockA}
            pfl={store.pflA} setPfl={store.setPflA}
            fx={store.fxA} setFx={store.setFxA}
            autogain={store.autogainA} setAutogain={store.setAutogainA}
            onTrackDrop={(id) => handleTrackDropToDeck(id, "A")}
          />

          {/* Center: Master + Crossfader + Auto DJ + Samples + Record */}
          <div className="beleram-center" style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
            <MasterControls />
            <Crossfader />
            <AutoDJPanel />
            <SamplePads />
            <RecordButton />
          </div>

          <Deck
            side="B" track={store.trackB} playing={store.playingB} setPlaying={store.setPlayingB}
            bpm={store.bpmB} setBpm={store.setBpmB} position={store.posB} setPosition={store.setPosB}
            volume={store.volB} setVolume={store.setVolB} eq={store.eqB} setEq={store.setEqB}
            loop={store.loopB} setLoop={store.setLoopB}
            loopStart={store.loopStartB} loopEnd={store.loopEndB} setLoopRegion={store.setLoopRegionB}
            loopSize={store.loopSizeB} setLoopSize={store.setLoopSizeB}
            hotCues={store.hotCuesB} setHotCue={store.setHotCueB}
            otherTrack={store.trackA}
            synced={store.syncB} setSynced={store.setSyncB} otherBpm={store.bpmA}
            keyLock={store.keyLockB} setKeyLock={store.setKeyLockB}
            pfl={store.pflB} setPfl={store.setPflB}
            fx={store.fxB} setFx={store.setFxB}
            autogain={store.autogainB} setAutogain={store.setAutogainB}
            onTrackDrop={(id) => handleTrackDropToDeck(id, "B")}
          />
        </div>

        {/* Bottom Panel */}
        <div style={{ flex: 1, minHeight: 220, borderRadius: 14, overflow: "hidden", background: "linear-gradient(180deg, rgba(20,20,35,0.9), rgba(12,12,25,0.95))", border: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="beleram-bottom-tabs" style={{ display: "flex", gap: 4 }}>
              {([["library", "Library"], ["queue", `Queue (${store.queue.length})`], ["history", `History (${store.history.length})`], ["spotify", "Spotify"], ["guide", "Guide"]] as const).map(([id, label]) => (
                <button key={id} onClick={() => store.setBottomTab(id)} style={{ padding: "5px 12px", borderRadius: 5, border: `1px solid ${store.bottomTab === id ? "#8866ff33" : "rgba(255,255,255,0.04)"}`, background: store.bottomTab === id ? "#8866ff15" : "transparent", color: store.bottomTab === id ? "#8866ff" : "#666", fontSize: 10, fontWeight: 600, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {store.bottomTab === "library" && (
            <>
              <FileDropZone onFilesDropped={handleFilesDropped} loading={fileLoading} />
              <TrackLibrary />
            </>
          )}
          {store.bottomTab === "queue" && <Queue />}
          {store.bottomTab === "history" && <History />}
          {store.bottomTab === "spotify" && <SpotifyBrowser />}
          {store.bottomTab === "guide" && <Guide />}
        </div>
      </div>

      <div style={{ padding: "8px 20px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.03)", fontSize: 9, color: "#333", fontFamily: "'JetBrains Mono', monospace" }}>
        BELERAM · Intelligent DJ Studio
      </div>
    </div>
  );
}
