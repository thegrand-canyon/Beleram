"use client";

import { useDJStore } from "@/stores/djStore";
import { TIPS } from "@/lib/constants";

export default function TipsBar() {
  const { showTips, activeTip, setActiveTip } = useDJStore();
  if (!showTips) return null;

  return (
    <div style={{ margin: "8px 20px 0", padding: 12, borderRadius: 10, background: "#ffaa0008", border: "1px solid #ffaa0022", animation: "slideUp 0.2s ease-out" }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
        {TIPS.map((_, i) => (
          <button key={i} onClick={() => setActiveTip(i)} style={{ width: 26, height: 26, borderRadius: 5, border: `1px solid ${i === activeTip ? "#ffaa00" : "rgba(255,255,255,0.06)"}`, background: i === activeTip ? "#ffaa0022" : "transparent", color: i === activeTip ? "#ffaa00" : "#666", fontSize: 12, cursor: "pointer" }}>{TIPS[i].icon}</button>
        ))}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#ffcc44", marginBottom: 3 }}>{TIPS[activeTip].title}</div>
      <div style={{ fontSize: 12, color: "#bba866", lineHeight: 1.5 }}>{TIPS[activeTip].text}</div>
    </div>
  );
}
