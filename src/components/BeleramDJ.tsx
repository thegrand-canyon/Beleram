"use client";

import { useEffect, useRef, useCallback } from "react";
import { useDJStore } from "@/stores/djStore";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useFileUpload } from "@/hooks/useFileUpload";
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
      if (!deck.buffer || deck.buffer !== store.trackA.audioBuffer) {
        deck.loadBuffer(store.trackA.audioBuffer);
      }
      deck.play();
    } else if (!store.playingA && deck.playing) {
      deck.pause();
    }
  }, [store.playingA, store.trackA, getEngine]);

  // Handle play/pause for deck B
  useEffect(() => {
    const engine = getEngine();
    const deck = engine.deckB;
    if (store.trackB?.audioBuffer && store.playingB && !deck.playing) {
      if (!deck.buffer || deck.buffer !== store.trackB.audioBuffer) {
        deck.loadBuffer(store.trackB.audioBuffer);
      }
      deck.play();
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

  // Auto transition crossfader
  useEffect(() => {
    if (!store.autoTrans) return;
    const speed = store.autoDJMode === "party" ? 2 : store.autoDJMode === "chill" ? 0.4 : 0.8;
    const interval = setInterval(() => {
      const s = useDJStore.getState();
      const next = s.crossfader + speed;
      if (next >= 100) {
        s.setAutoTrans(false);
        s.setTransitionProgress(0);
        s.setCrossfader(100);
      } else {
        s.setTransitionProgress(next);
        s.setCrossfader(next);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [store.autoTrans, store.autoDJMode]);

  // Auto DJ engine
  useEffect(() => {
    if (!store.autoDJ) return;
    const interval = setInterval(() => {
      const s = useDJStore.getState();
      if (s.trackA && s.posA > s.trackA.duration * 0.75 && !s.autoTrans && s.crossfader < 50) {
        if (s.queue.length > 0 && !s.trackB) {
          const next = s.shiftQueue();
          if (next) {
            s.setTrackB(next);
            s.setBpmB(next.bpm);
            s.setPosB(0);
            s.setPlayingB(true);
            s.setSyncB(true);
            s.setAutoDJStatus(`Loading "${next.title}" into Deck B...`);
            setTimeout(() => {
              const ss = useDJStore.getState();
              ss.setAutoTrans(true);
              ss.setAutoDJStatus(`Transitioning to "${next.title}"...`);
            }, 2000);
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
