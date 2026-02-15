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

    // Sync crossfader
    engine.setCrossfade(store.crossfader);

    // Sync volumes
    engine.deckA.setVolume(store.volA);
    engine.deckB.setVolume(store.volB);

    // Sync EQ
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
    if (store.trackA?.audioBuffer && store.playingA && !deck.playing) {
      engine.resume().then(() => {
        if (!deck.buffer || deck.buffer !== store.trackA!.audioBuffer) {
          deck.loadBuffer(store.trackA!.audioBuffer!);
        }
        deck.play();
      });
    } else if (!store.playingA && deck.playing) {
      deck.pause();
    }
  }, [store.playingA, store.trackA, getEngine]);

  // Handle play/pause for deck B
  useEffect(() => {
    const engine = getEngine();
    const deck = engine.deckB;
    if (store.trackB?.audioBuffer && store.playingB && !deck.playing) {
      engine.resume().then(() => {
        if (!deck.buffer || deck.buffer !== store.trackB!.audioBuffer) {
          deck.loadBuffer(store.trackB!.audioBuffer!);
        }
        deck.play();
      });
    } else if (!store.playingB && deck.playing) {
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

  // Update positions from audio engine (for tracks with real audio)
  useEffect(() => {
    const engine = getEngine();
    let raf: number;
    const tick = () => {
      if (store.trackA?.audioBuffer && engine.deckA.playing) {
        const pos = engine.deckA.currentTime;
        if (pos >= (store.trackA.duration || Infinity)) {
          store.setPlayingA(false);
          store.setPosA(0);
        } else {
          store.setPosA(pos);
        }
      }
      if (store.trackB?.audioBuffer && engine.deckB.playing) {
        const pos = engine.deckB.currentTime;
        if (pos >= (store.trackB.duration || Infinity)) {
          store.setPlayingB(false);
          store.setPosB(0);
        } else {
          store.setPosB(pos);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [store.trackA, store.trackB, getEngine, store]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "SELECT") return;

      const s = useDJStore.getState();
      switch (e.key.toLowerCase()) {
        case " ": // Space - toggle deck A play
          e.preventDefault();
          s.setPlayingA(!s.playingA);
          break;
        case "b": // B - toggle deck B play
          s.setPlayingB(!s.playingB);
          break;
        case "arrowleft": // Crossfader left
          s.setCrossfader(Math.max(0, s.crossfader - 5));
          break;
        case "arrowright": // Crossfader right
          s.setCrossfader(Math.min(100, s.crossfader + 5));
          break;
        case "s": // Sync deck B
          s.setSyncB(!s.syncB);
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Auto transition engine — different transition styles per mode
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

    // ─── SMART MODE: beat-aware, energy-reactive ───
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

        if (state.phase === "done") {
          finishTransition(s);
        }
      }, 50);
      return () => clearInterval(interval);
    }

    // ─── TIMED MODES ───
    // Duration in seconds
    const duration = mode === "party" ? 12 : mode === "drop" ? 20 : mode === "long" ? 45 : mode === "echo" ? 18 : 24;
    transStartTime.current = Date.now();

    const interval = setInterval(() => {
      const s = useDJStore.getState();
      const elapsed = (Date.now() - transStartTime.current) / 1000;
      const t = Math.min(1, elapsed / duration);

      if (mode === "smooth") {
        // ─── SMOOTH BLEND ───
        // Long gradual crossfade with professional bass-swap technique
        // Phase 1 (0–30%): Bring in new track with bass/mids cut, only highs
        // Phase 2 (30–50%): Slowly bring in mids on new track
        // Phase 3 (50–65%): Bass swap — cut outgoing bass, bring in incoming bass
        // Phase 4 (65–100%): Fade out outgoing track completely
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
          // Bass swap: smooth sine curve to avoid sudden cut
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
        // ─── DROP CUT ───
        // Build tension by filtering outgoing track, then hard-cut to new track
        // Phase 1 (0–60%): Slowly high-pass outgoing, tease new track quietly
        // Phase 2 (60–80%): Build tension — cut everything, just hi-hats
        // Phase 3 (80–85%): Brief silence/drop moment
        // Phase 4 (85–100%): BANG — snap to new track at full energy
        if (t < 0.6) {
          const p = t / 0.6;
          // Gradually filter outgoing — remove bass and mids
          s.setEqA({ hi: 50, mid: Math.round(50 - 30 * p), lo: Math.round(50 - 45 * p) });
          // Tease incoming — very quiet, just highs
          s.setEqB({ hi: Math.round(15 + 10 * p), mid: 5, lo: 0 });
          s.setCrossfader(startCrossfader + 20 * p);
          s.setVolB(Math.round(20 + 15 * p));
        } else if (t < 0.8) {
          const p = (t - 0.6) / 0.2;
          // Tension build — outgoing becomes just hi-hats
          s.setEqA({ hi: Math.round(40 - 20 * p), mid: Math.round(20 - 15 * p), lo: 5 });
          // Incoming still teasing
          s.setEqB({ hi: Math.round(25 + 10 * p), mid: Math.round(5 + 10 * p), lo: 0 });
          s.setCrossfader(startCrossfader + 20 + 15 * p);
          s.setVolB(Math.round(35 + 10 * p));
        } else if (t < 0.85) {
          // Brief tension moment — pull back both
          const p = (t - 0.8) / 0.05;
          s.setEqA({ hi: Math.round(20 - 15 * p), mid: 5, lo: 5 });
          s.setEqB({ hi: Math.round(35 - 20 * p), mid: Math.round(15 - 10 * p), lo: 0 });
          s.setVolA(Math.round(80 - 50 * p));
          s.setVolB(Math.round(45 - 20 * p));
          s.setCrossfader(startCrossfader + 35 + 5 * p);
        } else {
          // DROP! Hard cut to new track
          const p = (t - 0.85) / 0.15;
          // Snap crossfader and volume
          const snap = Math.min(1, p * 3); // Fast snap in first third of this phase
          s.setCrossfader(startCrossfader + 40 + 60 * snap);
          s.setVolA(Math.round(30 * (1 - snap)));
          s.setVolB(80);
          s.setEqA({ hi: Math.round(5 * (1 - snap)), mid: 5, lo: 5 });
          s.setEqB({ hi: 50, mid: 50, lo: 50 });
        }
      } else if (mode === "long") {
        // ─── LONG MIX (festival style) ───
        // Very slow, almost imperceptible blend over ~45 seconds
        // Gentle volume curves with careful EQ management
        const eased = t * t * (3 - 2 * t); // smoothstep
        const cf = startCrossfader + (100 - startCrossfader) * eased;
        s.setCrossfader(cf);

        if (t < 0.2) {
          // Introduce incoming track — just a whisper of highs
          const p = t / 0.2;
          s.setEqB({ hi: Math.round(10 + 20 * p), mid: Math.round(5 + 10 * p), lo: 0 });
          s.setEqA({ hi: 50, mid: 50, lo: 50 });
        } else if (t < 0.4) {
          // Gradually open up incoming mids
          const p = (t - 0.2) / 0.2;
          s.setEqB({ hi: Math.round(30 + 10 * p), mid: Math.round(15 + 20 * p), lo: Math.round(5 * p) });
          s.setEqA({ hi: 50, mid: 50, lo: 50 });
        } else if (t < 0.55) {
          // Slow bass swap
          const p = (t - 0.4) / 0.15;
          const curve = 0.5 - 0.5 * Math.cos(p * Math.PI);
          s.setEqA({ hi: 50, mid: 50, lo: Math.round(50 - 40 * curve) });
          s.setEqB({ hi: 40, mid: 35, lo: Math.round(5 + 45 * curve) });
        } else if (t < 0.75) {
          // Bring incoming to full, start pulling outgoing mids
          const p = (t - 0.55) / 0.2;
          s.setEqA({ hi: Math.round(50 - 15 * p), mid: Math.round(50 - 15 * p), lo: 10 });
          s.setEqB({ hi: 50, mid: 50, lo: 50 });
        } else {
          // Gentle fade out of outgoing
          const p = (t - 0.75) / 0.25;
          const fade = 0.5 + 0.5 * Math.cos(p * Math.PI);
          s.setEqA({ hi: Math.round(35 * fade), mid: Math.round(35 * fade), lo: Math.round(10 * fade) });
          s.setEqB({ hi: 50, mid: 50, lo: 50 });
        }
      } else if (mode === "echo") {
        // ─── ECHO OUT ───
        // Outgoing track fades with echo/filter effect, new track rises from silence
        // Phase 1 (0–30%): Bring in new track's highs while outgoing still strong
        // Phase 2 (30–50%): Cut outgoing bass, start EQ filtering (simulated echo)
        // Phase 3 (50–75%): Outgoing gets progressively more filtered, volume drops
        // Phase 4 (75–100%): New track takes over completely
        if (t < 0.3) {
          const p = t / 0.3;
          s.setCrossfader(startCrossfader + 15 * p);
          s.setEqB({ hi: Math.round(15 + 20 * p), mid: Math.round(5 + 10 * p), lo: 0 });
          s.setEqA({ hi: 50, mid: 50, lo: 50 });
        } else if (t < 0.5) {
          const p = (t - 0.3) / 0.2;
          s.setCrossfader(startCrossfader + 15 + 20 * p);
          // Simulate echo-out: progressively cut mids/bass, boost highs briefly
          s.setEqA({ hi: Math.round(50 + 10 * Math.sin(p * Math.PI)), mid: Math.round(50 - 25 * p), lo: Math.round(50 - 40 * p) });
          s.setEqB({ hi: Math.round(35 + 15 * p), mid: Math.round(15 + 20 * p), lo: Math.round(5 + 15 * p) });
        } else if (t < 0.75) {
          const p = (t - 0.5) / 0.25;
          s.setCrossfader(startCrossfader + 35 + 35 * p);
          // Outgoing: heavy filter, dropping volume
          s.setEqA({ hi: Math.round(60 - 40 * p), mid: Math.round(25 - 20 * p), lo: Math.round(10 - 8 * p) });
          s.setVolA(Math.round(80 - 40 * p));
          // Incoming: opening up
          const curve = 0.5 - 0.5 * Math.cos(p * Math.PI);
          s.setEqB({ hi: 50, mid: Math.round(35 + 15 * curve), lo: Math.round(20 + 30 * curve) });
        } else {
          const p = (t - 0.75) / 0.25;
          s.setCrossfader(startCrossfader + 70 + 30 * p);
          // Outgoing fades to nothing
          const fade = 1 - p;
          s.setEqA({ hi: Math.round(20 * fade), mid: Math.round(5 * fade), lo: 2 });
          s.setVolA(Math.round(40 * fade * fade));
          s.setEqB({ hi: 50, mid: 50, lo: 50 });
        }
      } else {
        // ─── QUICK MIX (party) ───
        // Fast but still musical — 12 seconds with punchy bass swap
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease-in-out quad
        const cf = startCrossfader + (100 - startCrossfader) * eased;
        s.setCrossfader(cf);

        if (t < 0.25) {
          const p = t / 0.25;
          s.setEqB({ hi: Math.round(30 + 20 * p), mid: Math.round(20 + 15 * p), lo: 10 });
          s.setEqA({ hi: 50, mid: 50, lo: 50 });
        } else if (t < 0.5) {
          const p = (t - 0.25) / 0.25;
          // Quick bass swap
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
  useEffect(() => {
    if (!store.autoDJ) return;
    const interval = setInterval(() => {
      const s = useDJStore.getState();
      // How early to load next track depends on mode (longer transitions need earlier load)
      const triggerPoint = s.autoDJMode === "smart" ? 0.50 : s.autoDJMode === "long" ? 0.55 : s.autoDJMode === "smooth" ? 0.65 : 0.70;
      const leadIn = s.autoDJMode === "smart" ? 3000 : s.autoDJMode === "long" ? 4000 : s.autoDJMode === "drop" ? 3000 : 2000;

      if (s.trackA && s.posA > s.trackA.duration * triggerPoint && !s.autoTrans && s.crossfader < 50) {
        if (s.queue.length > 0 && !s.trackB) {
          const next = s.shiftQueue();
          if (next) {
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
        const title = s.trackB.title;
        s.setTrackA(s.trackB);
        s.setBpmA(s.bpmB);
        s.setPosA(s.posB);
        s.setPlayingA(true);
        s.setTrackB(null);
        s.setPlayingB(false);
        s.setPosB(0);
        s.setCrossfader(0);
        s.setSyncB(false);
        s.setVolA(80);
        s.setAutoDJStatus(`Now playing: "${title}"`);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [store.autoDJ]);

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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 20px 0", gap: 10 }}>
        {/* Decks */}
        <div style={{ display: "flex", gap: 10 }}>
          <Deck
            side="A" track={store.trackA} playing={store.playingA} setPlaying={store.setPlayingA}
            bpm={store.bpmA} setBpm={store.setBpmA} position={store.posA} setPosition={store.setPosA}
            volume={store.volA} setVolume={store.setVolA} eq={store.eqA} setEq={store.setEqA}
            loop={store.loopA} setLoop={store.setLoopA} otherTrack={store.trackB}
            synced={store.syncA} setSynced={store.setSyncA} otherBpm={store.bpmB}
            onTrackDrop={(id) => handleTrackDropToDeck(id, "A")}
          />

          {/* Center: Crossfader + Auto DJ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 150 }}>
            <Crossfader />
            <AutoDJPanel />
          </div>

          <Deck
            side="B" track={store.trackB} playing={store.playingB} setPlaying={store.setPlayingB}
            bpm={store.bpmB} setBpm={store.setBpmB} position={store.posB} setPosition={store.setPosB}
            volume={store.volB} setVolume={store.setVolB} eq={store.eqB} setEq={store.setEqB}
            loop={store.loopB} setLoop={store.setLoopB} otherTrack={store.trackA}
            synced={store.syncB} setSynced={store.setSyncB} otherBpm={store.bpmA}
            onTrackDrop={(id) => handleTrackDropToDeck(id, "B")}
          />
        </div>

        {/* Bottom Panel */}
        <div style={{ flex: 1, minHeight: 220, borderRadius: 14, overflow: "hidden", background: "linear-gradient(180deg, rgba(20,20,35,0.9), rgba(12,12,25,0.95))", border: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {([["library", "🎵 Library"], ["queue", `📋 Queue (${store.queue.length})`], ["spotify", "🎧 Spotify"], ["guide", "📖 Guide"]] as const).map(([id, label]) => (
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
