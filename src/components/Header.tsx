"use client";

import { useDJStore } from "@/stores/djStore";

export default function Header() {
  const { autoDJ, showTips, setShowTips } = useDJStore();

  return (
    <div style={{ padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(10,10,20,0.6)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, #8866ff, #ff6ec7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎧</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, background: "linear-gradient(90deg, #00f0ff, #8866ff, #ff6ec7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>BELERAM</div>

        </div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {autoDJ && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "linear-gradient(90deg, #8866ff15, #ff6ec715)", border: "1px solid #8866ff33", animation: "glow 2s infinite" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff88", animation: "pulse 1s infinite" }} />
            <span style={{ fontSize: 10, color: "#aaa", fontFamily: "'JetBrains Mono', monospace" }}>AUTO DJ</span>
          </div>
        )}
        <button onClick={() => setShowTips(!showTips)} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${showTips ? "#ffaa00" : "rgba(255,255,255,0.08)"}`, background: showTips ? "#ffaa0015" : "rgba(255,255,255,0.03)", color: showTips ? "#ffaa00" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          💡 Tips
        </button>
      </div>
    </div>
  );
}
