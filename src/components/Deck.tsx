"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Track, EQState, EffectParams } from "@/types";
import { COMPATIBLE_KEYS } from "@/lib/constants";
import { formatTime } from "@/lib/formatters";
import { generateFakeWaveform } from "@/lib/trackUtils";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import Knob from "./Knob";
import Waveform from "./Waveform";
import VUMeter from "./VUMeter";
import EffectsRack from "./EffectsRack";
import SpectrumAnalyzer from "./SpectrumAnalyzer";

interface DeckProps {
  side: "A" | "B";
  track: Track | null;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  bpm: number;
  setBpm: (b: number) => void;
  position: number;
  setPosition: (p: number | ((prev: number) => number)) => void;
  volume: number;
  setVolume: (v: number) => void;
  eq: EQState;
  setEq: (eq: EQState) => void;
  loop: boolean;
  setLoop: (l: boolean) => void;
  loopStart: number | null;
  loopEnd: number | null;
  setLoopRegion: (start: number | null, end: number | null) => void;
  loopSize: number | null;
  setLoopSize: (size: number | null) => void;
  hotCues: (number | null)[];
  setHotCue: (idx: number, pos: number | null) => void;
  otherTrack: Track | null;
  synced: boolean;
  setSynced: (s: boolean) => void;
  otherBpm: number;
  keyLock: boolean;
  setKeyLock: (v: boolean) => void;
  pfl: boolean;
  setPfl: (v: boolean) => void;
  fx: { filter: EffectParams; delay: EffectParams; reverb: EffectParams; flanger: EffectParams };
  setFx: (fx: Partial<{ filter: EffectParams; delay: EffectParams; reverb: EffectParams; flanger: EffectParams }>) => void;
  onTrackDrop?: (trackId: string) => void;
}

const CUE_COLORS = ["#ff3366", "#00ff88", "#ffaa00", "#00aaff"];
const LOOP_SIZES = [0.25, 0.5, 1, 2, 4, 8, 16];
const BEAT_JUMPS = [1, 4, 16, 32];

export default function Deck({
  side, track, playing, setPlaying, bpm, setBpm,
  position, setPosition, volume, setVolume, eq, setEq,
  loop, setLoop, loopStart, loopEnd, setLoopRegion,
  loopSize, setLoopSize,
  hotCues, setHotCue,
  otherTrack, synced, setSynced, otherBpm,
  keyLock, setKeyLock, pfl, setPfl,
  fx, setFx,
  onTrackDrop,
}: DeckProps) {
  const color = side === "A" ? "#00f0ff" : "#ff6ec7";
  const { getEngine } = useAudioEngine();
  const [dragOver, setDragOver] = useState(false);
  const waveformRef = useRef<number[]>(generateFakeWaveform(track ? parseInt(track.id) : 0));
  const [vuLevel, setVuLevel] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRealAudio = !!track?.audioBuffer;
  const [beatPulse, setBeatPulse] = useState(false);

  useEffect(() => {
    if (track) {
      if (track.waveformData) {
        waveformRef.current = track.waveformData;
      } else {
        waveformRef.current = generateFakeWaveform(parseInt(track.id) || 0);
      }
    }
  }, [track]);

  // Beat pulse indicator
  useEffect(() => {
    if (!playing || !bpm) return;
    const interval = (60 / bpm) * 1000;
    const timer = setInterval(() => {
      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), 80);
    }, interval);
    return () => clearInterval(timer);
  }, [playing, bpm]);

  // Real VU meter from audio engine
  useEffect(() => {
    if (!hasRealAudio || !playing) {
      setVuLevel(0);
      return;
    }
    const engine = getEngine();
    const deck = side === "A" ? engine.deckA : engine.deckB;
    const interval = setInterval(() => {
      setVuLevel(deck.getVULevel());
    }, 50);
    return () => clearInterval(interval);
  }, [hasRealAudio, playing, side, getEngine]);

  // Sync key lock to audio engine
  useEffect(() => {
    if (!hasRealAudio) return;
    const engine = getEngine();
    const deck = side === "A" ? engine.deckA : engine.deckB;
    deck.setKeyLock(keyLock);
  }, [keyLock, hasRealAudio, side, getEngine]);

  // Sync PFL to audio engine
  useEffect(() => {
    if (!hasRealAudio) return;
    const engine = getEngine();
    const deck = side === "A" ? engine.deckA : engine.deckB;
    deck.setPFL(pfl);
  }, [pfl, hasRealAudio, side, getEngine]);

  // Simulated playback for demo tracks
  useEffect(() => {
    if (hasRealAudio) return;
    if (playing && track) {
      intervalRef.current = setInterval(() => {
        setPosition((p: number) => {
          if (p >= track.duration) { setPlaying(false); return 0; }
          if (loop) {
            const ls = loopStart != null ? loopStart * track.duration : track.duration * 0.5;
            const le = loopEnd != null ? loopEnd * track.duration : track.duration * 0.75;
            if (p >= le) return ls;
          }
          return p + 0.1;
        });
        setVuLevel(40 + Math.random() * 45 * (volume / 100));
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (!hasRealAudio) setVuLevel(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, track, loop, loopStart, loopEnd, volume, setPosition, setPlaying, hasRealAudio]);

  // Seek handler
  const handleSeek = useCallback((progress: number) => {
    if (!track) return;
    const time = progress * track.duration;
    if (hasRealAudio) {
      const engine = getEngine();
      engine.resume().then(() => {
        const deck = side === "A" ? engine.deckA : engine.deckB;
        deck.seek(time);
      });
    }
    setPosition(time);
  }, [track, hasRealAudio, side, getEngine, setPosition]);

  // Hot cue handler
  const handleHotCue = useCallback((idx: number) => {
    if (!track) return;
    if (hotCues[idx] != null) {
      handleSeek(hotCues[idx]!);
    } else {
      setHotCue(idx, position / track.duration);
    }
  }, [track, hotCues, position, handleSeek, setHotCue]);

  // Auto-loop: set loop region based on beat size
  const handleAutoLoop = useCallback((beats: number) => {
    if (!track || !bpm) return;
    const beatDuration = 60 / bpm;
    const loopDuration = beatDuration * beats;
    const currentProgress = position / track.duration;
    const loopDurationProgress = loopDuration / track.duration;
    const endProgress = Math.min(1, currentProgress + loopDurationProgress);

    setLoopRegion(currentProgress, endProgress);
    setLoopSize(beats);
    if (!loop) setLoop(true);

    // If playing with real audio, seek to loop start
    if (hasRealAudio && playing) {
      const engine = getEngine();
      const deck = side === "A" ? engine.deckA : engine.deckB;
      deck.seek(currentProgress * track.duration);
    }
  }, [track, bpm, position, loop, setLoop, setLoopRegion, setLoopSize, hasRealAudio, playing, side, getEngine]);

  // Beat jump
  const handleBeatJump = useCallback((beats: number) => {
    if (!track || !bpm) return;
    const beatDuration = 60 / bpm;
    const jumpSeconds = beatDuration * beats;
    const newTime = Math.max(0, Math.min(track.duration, position + jumpSeconds));
    const newProgress = newTime / track.duration;
    handleSeek(newProgress);
  }, [track, bpm, position, handleSeek]);

  // Loop region: set start/end at current position
  const handleSetLoopIn = useCallback(() => {
    if (!track) return;
    const progress = position / track.duration;
    setLoopRegion(progress, loopEnd ?? Math.min(1, progress + 0.1));
    setLoopSize(null);
    if (!loop) setLoop(true);
  }, [track, position, loopEnd, setLoopRegion, setLoopSize, loop, setLoop]);

  const handleSetLoopOut = useCallback(() => {
    if (!track) return;
    const progress = position / track.duration;
    setLoopRegion(loopStart ?? Math.max(0, progress - 0.1), progress);
    setLoopSize(null);
    if (!loop) setLoop(true);
  }, [track, position, loopStart, setLoopRegion, setLoopSize, loop, setLoop]);

  useEffect(() => {
    if (synced && otherBpm) setBpm(otherBpm);
  }, [synced, otherBpm, setBpm]);

  const keyCompat = track && otherTrack && COMPATIBLE_KEYS[track.key]?.includes(otherTrack.key);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/beleram-track-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const trackId = e.dataTransfer.getData("application/beleram-track-id");
    if (trackId && onTrackDrop) onTrackDrop(trackId);
  }, [onTrackDrop]);

  const waveformHotCues = track ? hotCues : undefined;
  const waveformLoopStart = track && loop ? loopStart : null;
  const waveformLoopEnd = track && loop ? loopEnd : null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        flex: 1, background: dragOver
          ? `linear-gradient(180deg, ${color}15, ${color}08)`
          : "linear-gradient(180deg, rgba(20,20,35,0.95), rgba(12,12,25,0.98))",
        borderRadius: 14, padding: 14,
        border: dragOver ? `2px solid ${color}66` : `1px solid ${color}15`,
        boxShadow: dragOver ? `0 0 30px ${color}22, inset 0 0 20px ${color}08` : `inset 0 1px 0 ${color}08, 0 4px 30px rgba(0,0,0,0.3)`,
        display: "flex", flexDirection: "column", gap: 6, position: "relative", overflow: "hidden",
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ position: "absolute", top: -50, [side === "A" ? "left" : "right"]: -50, width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${color}08, transparent 70%)`, pointerEvents: "none" }} />

      {dragOver && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10, borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${color}15`, backdropFilter: "blur(2px)", pointerEvents: "none",
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color, letterSpacing: 2, textTransform: "uppercase" }}>
            Drop to load Deck {side}
          </div>
        </div>
      )}

      {/* Header: deck label, VU, controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
            background: beatPulse ? `${color}33` : `${color}15`,
            border: `1px solid ${beatPulse ? color : color + "33"}`,
            fontWeight: 800, fontSize: 13, color,
            boxShadow: beatPulse ? `0 0 12px ${color}44` : "none",
            transition: "all 0.05s",
          }}>{side}</div>
          <VUMeter level={vuLevel} color={color} />
        </div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={() => setKeyLock(!keyLock)} title="Key Lock — prevents pitch change when adjusting tempo" style={{ padding: "3px 7px", borderRadius: 4, border: `1px solid ${keyLock ? "#ffaa00" : "rgba(255,255,255,0.06)"}`, background: keyLock ? "#ffaa0018" : "transparent", color: keyLock ? "#ffaa00" : "#555", fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
            {keyLock ? "KEY" : "KEY"}
          </button>
          <button onClick={() => setPfl(!pfl)} title="Pre-Fader Listen — headphone cue" style={{ padding: "3px 7px", borderRadius: 4, border: `1px solid ${pfl ? "#00ff88" : "rgba(255,255,255,0.06)"}`, background: pfl ? "#00ff8818" : "transparent", color: pfl ? "#00ff88" : "#555", fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
            PFL
          </button>
          <button onClick={() => setSynced(!synced)} style={{ padding: "3px 7px", borderRadius: 4, border: `1px solid ${synced ? "#00ff88" : "rgba(255,255,255,0.06)"}`, background: synced ? "#00ff8818" : "transparent", color: synced ? "#00ff88" : "#555", fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
            {synced ? "SYNC" : "SYNC"}
          </button>
          {track && otherTrack && (
            <div style={{ padding: "3px 6px", borderRadius: 4, background: keyCompat ? "#00ff8812" : "#ff336612", border: `1px solid ${keyCompat ? "#00ff8833" : "#ff336633"}`, color: keyCompat ? "#00ff88" : "#ff5577", fontSize: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              {keyCompat ? "KEY" : "KEY"}
            </div>
          )}
        </div>
      </div>

      {/* Track info */}
      {track ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#eee" }}>{track.title}</div>
            {!hasRealAudio && (
              <span style={{ fontSize: 7, color: "#ffaa00", padding: "1px 5px", background: "#ffaa0015", borderRadius: 3, fontWeight: 700, border: "1px solid #ffaa0022" }}>DEMO</span>
            )}
          </div>
          <div style={{ fontSize: 10, color: "#8888aa", marginTop: 1 }}>{track.artist} · {track.genre}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
            {[`${bpm} BPM`, `KEY: ${track.key}`, `${track.energy}/10`].map((t, i) => (
              <span key={i} style={{ fontSize: 9, color: i === 0 ? color : "#aaa", fontFamily: "'JetBrains Mono', monospace", background: i === 0 ? `${color}11` : "rgba(255,255,255,0.04)", padding: "1px 6px", borderRadius: 3 }}>{t}</span>
            ))}
            {keyLock && <span style={{ fontSize: 8, color: "#ffaa00", fontFamily: "'JetBrains Mono', monospace", background: "#ffaa0012", padding: "1px 5px", borderRadius: 3, border: "1px solid #ffaa0022" }}>LOCKED</span>}
          </div>
        </div>
      ) : (
        <div style={{ padding: "8px 0", textAlign: "center", color: "#555", fontSize: 11 }}>Upload audio files and load a track</div>
      )}

      {/* Waveform */}
      <div style={{ position: "relative" }}>
        <Waveform
          data={waveformRef.current}
          rgbData={track?.rgbWaveformData}
          progress={track ? position / track.duration : 0}
          color={color}
          playing={playing}
          onSeek={handleSeek}
          hotCues={waveformHotCues}
          loopStart={waveformLoopStart}
          loopEnd={waveformLoopEnd}
        />
        {track && <div style={{ position: "absolute", bottom: 2, right: 6, fontSize: 9, color: "#aaa", fontFamily: "'JetBrains Mono', monospace", pointerEvents: "none" }}>{formatTime(position)} / {formatTime(track.duration)}</div>}
      </div>

      {/* Spectrum Analyzer */}
      <SpectrumAnalyzer side={side} playing={playing} hasRealAudio={hasRealAudio} />

      {/* Hot cues + Loop controls */}
      {track && (
        <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              onClick={() => handleHotCue(i)}
              onContextMenu={(e) => { e.preventDefault(); setHotCue(i, null); }}
              title={hotCues[i] != null ? `Cue ${i + 1} (right-click to clear)` : `Set cue ${i + 1}`}
              style={{
                width: 24, height: 20, borderRadius: 3, fontSize: 8, fontWeight: 700, cursor: "pointer",
                border: `1px solid ${hotCues[i] != null ? CUE_COLORS[i] + "66" : "rgba(255,255,255,0.06)"}`,
                background: hotCues[i] != null ? CUE_COLORS[i] + "22" : "rgba(255,255,255,0.02)",
                color: hotCues[i] != null ? CUE_COLORS[i] : "#444",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {i + 1}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
          <button onClick={handleSetLoopIn} style={{ padding: "0 6px", height: 20, borderRadius: 3, fontSize: 7, fontWeight: 700, cursor: "pointer", border: `1px solid ${loop ? "#ffaa0044" : "rgba(255,255,255,0.06)"}`, background: loop ? "#ffaa0012" : "rgba(255,255,255,0.02)", color: loop ? "#ffaa00" : "#444", fontFamily: "'JetBrains Mono', monospace" }}>IN</button>
          <button onClick={handleSetLoopOut} style={{ padding: "0 6px", height: 20, borderRadius: 3, fontSize: 7, fontWeight: 700, cursor: "pointer", border: `1px solid ${loop ? "#ffaa0044" : "rgba(255,255,255,0.06)"}`, background: loop ? "#ffaa0012" : "rgba(255,255,255,0.02)", color: loop ? "#ffaa00" : "#444", fontFamily: "'JetBrains Mono', monospace" }}>OUT</button>
        </div>
      )}

      {/* Auto-Loop Sizes */}
      {track && (
        <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
          {LOOP_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => handleAutoLoop(size)}
              style={{
                padding: "2px 5px", borderRadius: 3, fontSize: 7, fontWeight: 700, cursor: "pointer",
                border: `1px solid ${loopSize === size && loop ? "#ffaa00" : "rgba(255,255,255,0.05)"}`,
                background: loopSize === size && loop ? "#ffaa0018" : "rgba(255,255,255,0.02)",
                color: loopSize === size && loop ? "#ffaa00" : "#555",
                fontFamily: "'JetBrains Mono', monospace",
                minWidth: 22,
              }}
            >
              {size < 1 ? `1/${1 / size}` : size}
            </button>
          ))}
          {loop && (
            <button
              onClick={() => { setLoop(false); setLoopRegion(null, null); setLoopSize(null); }}
              style={{
                padding: "2px 5px", borderRadius: 3, fontSize: 7, fontWeight: 700, cursor: "pointer",
                border: "1px solid #ff336644", background: "#ff336612", color: "#ff5566",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              OFF
            </button>
          )}
        </div>
      )}

      {/* Beat Jump */}
      {track && (
        <div style={{ display: "flex", gap: 2, justifyContent: "center", alignItems: "center" }}>
          <span style={{ fontSize: 7, color: "#555", fontFamily: "'JetBrains Mono', monospace", marginRight: 2 }}>JUMP</span>
          {BEAT_JUMPS.map((beats) => (
            <div key={beats} style={{ display: "flex", gap: 1 }}>
              <button onClick={() => handleBeatJump(-beats)} style={{ padding: "2px 4px", borderRadius: 3, fontSize: 7, fontWeight: 700, cursor: "pointer", border: `1px solid ${color}22`, background: "transparent", color: "#666", fontFamily: "'JetBrains Mono', monospace" }}>
                -{beats}
              </button>
              <button onClick={() => handleBeatJump(beats)} style={{ padding: "2px 4px", borderRadius: 3, fontSize: 7, fontWeight: 700, cursor: "pointer", border: `1px solid ${color}22`, background: "transparent", color: "#666", fontFamily: "'JetBrains Mono', monospace" }}>
                +{beats}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Transport controls */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 5 }}>
        <button onClick={() => track && setPosition(0)} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${color}33`, background: "rgba(255,255,255,0.02)", color, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>|&lt;</button>
        <button onClick={() => track && setPlaying(!playing)} style={{ width: 42, height: 42, borderRadius: 9, border: `2px solid ${playing ? color : color + "55"}`, background: playing ? `${color}22` : "rgba(255,255,255,0.02)", color: playing ? color : "#aaa", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: playing ? `0 0 20px ${color}33` : "none", transition: "all 0.2s" }}>
          {playing ? "||" : ">"}
        </button>
        <button onClick={() => { setLoop(!loop); if (loop) { setLoopRegion(null, null); setLoopSize(null); } }} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${loop ? "#ffaa00" : color + "33"}`, background: loop ? "#ffaa0018" : "rgba(255,255,255,0.02)", color: loop ? "#ffaa00" : "#666", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>LP</button>
      </div>

      {/* BPM controls */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4 }}>
        <button onClick={() => setBpm(Math.max(80, bpm - 1))} style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${color}22`, background: "transparent", color: "#666", fontSize: 12, cursor: "pointer" }}>-</button>
        <div style={{ padding: "2px 10px", borderRadius: 4, background: "rgba(0,0,0,0.3)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color, minWidth: 65, textAlign: "center" }}>{bpm} <span style={{ fontSize: 7, color: "#666" }}>BPM</span></div>
        <button onClick={() => setBpm(Math.min(180, bpm + 1))} style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${color}22`, background: "transparent", color: "#666", fontSize: 12, cursor: "pointer" }}>+</button>
      </div>

      {/* EQ + Volume knobs */}
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
        <Knob value={eq.hi} onChange={(v) => setEq({ ...eq, hi: v })} label="HI" color={color} size={38} />
        <Knob value={eq.mid} onChange={(v) => setEq({ ...eq, mid: v })} label="MID" color={color} size={38} />
        <Knob value={eq.lo} onChange={(v) => setEq({ ...eq, lo: v })} label="LO" color={color} size={38} />
        <div style={{ width: 1, height: 35, background: "rgba(255,255,255,0.04)" }} />
        <Knob value={volume} onChange={setVolume} label="VOL" color={color} size={44} />
      </div>

      {/* Effects Rack */}
      <EffectsRack side={side} fx={fx} setFx={setFx} />
    </div>
  );
}
