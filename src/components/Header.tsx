"use client";

import { useState } from "react";
import { useDJStore } from "@/stores/djStore";

const SHORTCUTS = [
  ["Space", "Play/Pause Deck A"],
  ["B", "Play/Pause Deck B"],
  ["← →", "Crossfader"],
  ["S", "Sync Deck B"],
  ["1-4", "Hot Cues Deck A"],
  ["Q", "Toggle Loop A"],
  ["L", "Toggle Loop B"],
];

export default function Header() {
  const { autoDJ, showTips, setShowTips } = useDJStore();
  const [showKeys, setShowKeys] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(10,10,20,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, #8866ff, #ff6ec7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎧</div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, background: "linear-gradient(90deg, #00f0ff, #8866ff, #ff6ec7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>BELERAM</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {autoDJ && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "linear-gradient(90deg, #8866ff15, #ff6ec715)", border: "1px solid #8866ff33", animation: "glow 2s infinite" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff88", animation: "pulse 1s infinite" }} />
              <span style={{ fontSize: 10, color: "#aaa", fontFamily: "'JetBrains Mono', monospace" }}>AUTO DJ</span>
            </div>
          )}
          <button onClick={() => setShowKeys(!showKeys)} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${showKeys ? "#00f0ff33" : "rgba(255,255,255,0.08)"}`, background: showKeys ? "#00f0ff10" : "rgba(255,255,255,0.03)", color: showKeys ? "#00f0ff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            ⌨ Keys
          </button>
          <button onClick={() => setShowTips(!showTips)} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${showTips ? "#ffaa00" : "rgba(255,255,255,0.08)"}`, background: showTips ? "#ffaa0015" : "rgba(255,255,255,0.03)", color: showTips ? "#ffaa00" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            💡 Tips
          </button>
        </div>
      </div>

      {showKeys && (
        <div style={{
          position: "absolute", right: 20, top: "100%", zIndex: 50,
          padding: "12px 16px", borderRadius: 10,
          background: "rgba(15,15,30,0.97)", border: "1px solid rgba(0,240,255,0.15)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
          animation: "slideUp 0.15s ease-out",
        }}>
          <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>Keyboard Shortcuts</div>
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 20, padding: "3px 0" }}>
              <span style={{ fontSize: 10, color: "#00f0ff", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, minWidth: 40 }}>{key}</span>
              <span style={{ fontSize: 10, color: "#888" }}>{desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
