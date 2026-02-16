"use client";

import { useEffect, useState, useRef } from "react";
import { useDJStore } from "@/stores/djStore";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import Knob from "./Knob";

export default function MasterControls() {
  const { masterVol, setMasterVol } = useDJStore();
  const { getEngine } = useAudioEngine();
  const [masterVU, setMasterVU] = useState(0);
  const [isClipping, setIsClipping] = useState(false);

  // Sync master volume to engine
  useEffect(() => {
    const engine = getEngine();
    engine.setMasterVolume(masterVol);
  }, [masterVol, getEngine]);

  // Master VU meter
  useEffect(() => {
    const engine = getEngine();
    const interval = setInterval(() => {
      const level = engine.getMasterVULevel();
      setMasterVU(level);
      setIsClipping(level > 90);
    }, 50);
    return () => clearInterval(interval);
  }, [getEngine]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      padding: "10px 10px", borderRadius: 8,
      background: "linear-gradient(180deg, rgba(25,25,40,0.9), rgba(15,15,28,0.95))",
      border: "1px solid rgba(255,255,255,0.04)",
    }}>
      <span style={{ fontSize: 7, color: "#555", textTransform: "uppercase", letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" }}>MASTER</span>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Knob value={masterVol} onChange={setMasterVol} label="" color="#8866ff" size={40} />

        {/* Vertical VU meter */}
        <div style={{ display: "flex", flexDirection: "column-reverse", gap: 1, height: 40, width: 8 }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const threshold = (i / 12) * 100;
            const active = masterVU > threshold;
            const color = i >= 10 ? "#ff3333" : i >= 8 ? "#ffaa00" : "#00ff88";
            return (
              <div key={i} style={{
                flex: 1, borderRadius: 1,
                background: active ? color : "rgba(255,255,255,0.04)",
                transition: "background 0.05s",
              }} />
            );
          })}
        </div>
      </div>

      {isClipping && (
        <div style={{
          fontSize: 7, color: "#ff3333", fontWeight: 800,
          fontFamily: "'JetBrains Mono', monospace",
          animation: "pulse 0.5s infinite",
        }}>CLIP</div>
      )}

      <div style={{ fontSize: 9, color: "#666", fontFamily: "'JetBrains Mono', monospace" }}>
        {masterVol}%
      </div>
    </div>
  );
}
