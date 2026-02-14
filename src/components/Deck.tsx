"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Track, EQState } from "@/types";
import { COMPATIBLE_KEYS } from "@/lib/constants";
import { formatTime } from "@/lib/formatters";
import { generateFakeWaveform } from "@/lib/trackUtils";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import Knob from "./Knob";
import Waveform from "./Waveform";
import VUMeter from "./VUMeter";

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
  otherTrack: Track | null;
  synced: boolean;
  setSynced: (s: boolean) => void;
  otherBpm: number;
}

export default function Deck({
  side, track, playing, setPlaying, bpm, setBpm,
  position, setPosition, volume, setVolume, eq, setEq,
  loop, setLoop, otherTrack, synced, setSynced, otherBpm,
}: DeckProps) {
  const color = side === "A" ? "#00f0ff" : "#ff6ec7";
  const { getEngine } = useAudioEngine();
  const waveformRef = useRef<number[]>(generateFakeWaveform(track ? parseInt(track.id) : 0));
  const [vuLevel, setVuLevel] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRealAudio = !!track?.audioBuffer;

  useEffect(() => {
    if (track) {
      if (track.waveformData) {
        waveformRef.current = track.waveformData;
      } else {
        waveformRef.current = generateFakeWaveform(parseInt(track.id) || 0);
      }
    }
  }, [track]);

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

  // Simulated playback for demo tracks (no audioBuffer)
  useEffect(() => {
    if (hasRealAudio) return; // Real audio handled by BeleramDJ
    if (playing && track) {
      intervalRef.current = setInterval(() => {
        setPosition((p: number) => {
          if (p >= track.duration) { setPlaying(false); return 0; }
          if (loop && p >= track.duration * 0.75) return track.duration * 0.5;
          return p + 0.1;
        });
        setVuLevel(40 + Math.random() * 45 * (volume / 100));
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (!hasRealAudio) setVuLevel(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, track, loop, volume, setPosition, setPlaying, hasRealAudio]);

  // Seek handler for waveform click
  const handleSeek = useCallback((progress: number) => {
    if (!track) return;
    const time = progress * track.duration;
    if (hasRealAudio) {
      const engine = getEngine();
      const deck = side === "A" ? engine.deckA : engine.deckB;
      deck.seek(time);
    }
    setPosition(time);
  }, [track, hasRealAudio, side, getEngine, setPosition]);

  useEffect(() => {
    if (synced && otherBpm) setBpm(otherBpm);
  }, [synced, otherBpm, setBpm]);

  const keyCompat = track && otherTrack && COMPATIBLE_KEYS[track.key]?.includes(otherTrack.key);

  return (
    <div style={{
      flex: 1, background: "linear-gradient(180deg, rgba(20,20,35,0.95), rgba(12,12,25,0.98))",
      borderRadius: 14, padding: 16, border: `1px solid ${color}15`,
      boxShadow: `inset 0 1px 0 ${color}08, 0 4px 30px rgba(0,0,0,0.3)`,
      display: "flex", flexDirection: "column", gap: 10, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -50, [side === "A" ? "left" : "right"]: -50, width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${color}08, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}15`, border: `1px solid ${color}33`, fontWeight: 800, fontSize: 14, color }}>{side}</div>
          <VUMeter level={vuLevel} color={color} />
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={() => setSynced(!synced)} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${synced ? "#00ff88" : color + "33"}`, background: synced ? "#00ff8822" : "transparent", color: synced ? "#00ff88" : "#8888aa", fontSize: 9, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace" }}>
            {synced ? "✓ SYNC" : "SYNC"}
          </button>
          {track && otherTrack && (
            <div style={{ padding: "4px 8px", borderRadius: 5, background: keyCompat ? "#00ff8815" : "#ff336615", border: `1px solid ${keyCompat ? "#00ff8833" : "#ff336633"}`, color: keyCompat ? "#00ff88" : "#ff5577", fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              {keyCompat ? "KEY ✓" : "KEY ✗"}
            </div>
          )}
        </div>
      </div>

      {track ? (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#eee" }}>{track.title}</div>
          <div style={{ fontSize: 11, color: "#8888aa", marginTop: 2 }}>{track.artist} · {track.genre}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
            {[`${bpm} BPM`, `KEY: ${track.key}`, `⚡ ${track.energy}/10`].map((t, i) => (
              <span key={i} style={{ fontSize: 10, color: i === 0 ? color : "#aaa", fontFamily: "'JetBrains Mono', monospace", background: i === 0 ? `${color}11` : "rgba(255,255,255,0.04)", padding: "2px 7px", borderRadius: 4 }}>{t}</span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: "12px 0", textAlign: "center", color: "#555", fontSize: 12 }}>Load a track or use Auto DJ ↓</div>
      )}

      <div style={{ position: "relative" }}>
        <Waveform data={waveformRef.current} progress={track ? position / track.duration : 0} color={color} playing={playing} onSeek={handleSeek} />
        {track && <div style={{ position: "absolute", bottom: 3, right: 8, fontSize: 10, color: "#aaa", fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(position)} / {formatTime(track.duration)}</div>}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
        <button onClick={() => track && setPosition(0)} style={{ width: 36, height: 36, borderRadius: 7, border: `1px solid ${color}33`, background: "rgba(255,255,255,0.03)", color, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⏮</button>
        <button onClick={() => track && setPlaying(!playing)} style={{ width: 48, height: 48, borderRadius: 10, border: `2px solid ${playing ? color : color + "55"}`, background: playing ? `${color}22` : "rgba(255,255,255,0.03)", color: playing ? color : "#aaa", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: playing ? `0 0 20px ${color}33` : "none", transition: "all 0.2s" }}>
          {playing ? "⏸" : "▶"}
        </button>
        <button onClick={() => setLoop(!loop)} style={{ width: 36, height: 36, borderRadius: 7, border: `1px solid ${loop ? "#ffaa00" : color + "33"}`, background: loop ? "#ffaa0022" : "rgba(255,255,255,0.03)", color: loop ? "#ffaa00" : "#888", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🔁</button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
        <button onClick={() => setBpm(Math.max(80, bpm - 1))} style={{ width: 26, height: 26, borderRadius: 5, border: `1px solid ${color}22`, background: "transparent", color: "#888", fontSize: 13, cursor: "pointer" }}>−</button>
        <div style={{ padding: "3px 14px", borderRadius: 5, background: "rgba(0,0,0,0.3)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color, minWidth: 75, textAlign: "center" }}>{bpm} <span style={{ fontSize: 8, color: "#666" }}>BPM</span></div>
        <button onClick={() => setBpm(Math.min(180, bpm + 1))} style={{ width: 26, height: 26, borderRadius: 5, border: `1px solid ${color}22`, background: "transparent", color: "#888", fontSize: 13, cursor: "pointer" }}>+</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
        <Knob value={eq.hi} onChange={(v) => setEq({ ...eq, hi: v })} label="HI" color={color} size={42} />
        <Knob value={eq.mid} onChange={(v) => setEq({ ...eq, mid: v })} label="MID" color={color} size={42} />
        <Knob value={eq.lo} onChange={(v) => setEq({ ...eq, lo: v })} label="LO" color={color} size={42} />
        <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.06)" }} />
        <Knob value={volume} onChange={setVolume} label="VOL" color={color} size={48} />
      </div>
    </div>
  );
}
