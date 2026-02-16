"use client";

import { useState, useCallback, useRef } from "react";
import { useAudioEngine } from "@/hooks/useAudioEngine";

export default function SamplePads() {
  const { getEngine } = useAudioEngine();
  const [activePads, setActivePads] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingPad, setEditingPad] = useState<number | null>(null);
  const [padNames, setPadNames] = useState<string[]>([
    "Kick", "Snare", "Clap", "Hi-Hat", "Air Horn", "Riser", "Impact", "Vocal",
  ]);

  const handleTrigger = useCallback((idx: number) => {
    const engine = getEngine();
    engine.samples.trigger(idx);
    setActivePads((prev) => new Set([...prev, idx]));
    setTimeout(() => {
      setActivePads((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }, 150);
  }, [getEngine]);

  const handleLoadSample = useCallback(async (idx: number, file: File) => {
    const engine = getEngine();
    await engine.samples.loadCustomSample(idx, file);
    setPadNames((prev) => {
      const next = [...prev];
      next[idx] = file.name.replace(/\.(mp3|wav|ogg|flac|m4a)$/i, "");
      return next;
    });
  }, [getEngine]);

  const handleContextMenu = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    setEditingPad(idx);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingPad !== null) {
      handleLoadSample(editingPad, file);
    }
    setEditingPad(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [editingPad, handleLoadSample]);

  const COLORS = ["#ff3366", "#ff6633", "#ffaa00", "#00ff88", "#00f0ff", "#8866ff", "#ff6ec7", "#aa88ff"];

  return (
    <div style={{ padding: "8px 12px" }}>
      <div style={{ fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
        SAMPLE PADS <span style={{ color: "#444", fontWeight: 400 }}>(right-click to load)</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
        {Array.from({ length: 8 }).map((_, idx) => {
          const isActive = activePads.has(idx);
          const c = COLORS[idx];
          return (
            <button
              key={idx}
              onClick={() => handleTrigger(idx)}
              onContextMenu={(e) => handleContextMenu(e, idx)}
              style={{
                height: 48, borderRadius: 6, border: `1px solid ${isActive ? c : c + "33"}`,
                background: isActive ? `${c}33` : `${c}08`,
                color: isActive ? c : c + "aa",
                fontSize: 9, fontWeight: 700, cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 2,
                transition: "all 0.05s",
                boxShadow: isActive ? `0 0 15px ${c}44` : "none",
              }}
            >
              <span style={{ fontSize: 7, opacity: 0.5 }}>{idx + 1}</span>
              <span style={{ fontSize: 8 }}>{padNames[idx]}</span>
            </button>
          );
        })}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
