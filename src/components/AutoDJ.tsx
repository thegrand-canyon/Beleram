"use client";

import { useDJStore } from "@/stores/djStore";
import { AUTO_DJ_MODES } from "@/lib/constants";
import { AutoDJMode } from "@/types";

export default function AutoDJPanel() {
  const {
    autoDJ, setAutoDJ, autoDJMode, setAutoDJMode,
    setAutoDJStatus, setAutoTrans, queue,
    trackA, playingA, setPlayingA,
    setBpmA, setPosA, setTrackA,
    shiftQueue,
  } = useDJStore();

  const startAutoDJ = () => {
    if (queue.length === 0 && !trackA) return;
    if (!trackA && queue.length > 0) {
      const first = shiftQueue();
      if (first) {
        setTrackA(first);
        setBpmA(first.bpm);
        setPosA(0);
        setPlayingA(true);
      }
    } else if (!playingA && trackA) {
      setPlayingA(true);
    }
    setAutoDJ(true);
    setAutoDJStatus("Auto DJ running — sit back and enjoy!");
  };

  const stopAutoDJ = () => {
    setAutoDJ(false);
    setAutoTrans(false);
    setAutoDJStatus("");
  };

  return (
    <div style={{ padding: "12px 10px", background: "linear-gradient(180deg, rgba(25,25,40,0.9), rgba(15,15,28,0.95))", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" }}>AUTO DJ</span>
      <select value={autoDJMode} onChange={(e) => setAutoDJMode(e.target.value as AutoDJMode)} style={{ width: "100%", padding: "5px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.4)", color: "#aaa", fontSize: 10, outline: "none", fontFamily: "'JetBrains Mono', monospace" }}>
        {AUTO_DJ_MODES.map((m) => <option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}
      </select>
      <div style={{ fontSize: 8, color: "#555", textAlign: "center", lineHeight: 1.3 }}>
        {AUTO_DJ_MODES.find((m) => m.id === autoDJMode)?.desc}
      </div>
      <button onClick={autoDJ ? stopAutoDJ : startAutoDJ} disabled={!autoDJ && queue.length === 0 && !trackA} style={{
        width: "100%", padding: "8px", borderRadius: 6,
        border: `1px solid ${autoDJ ? "#ff336655" : "#00ff8833"}`,
        background: autoDJ ? "linear-gradient(135deg, #ff336620, #ff660020)" : "linear-gradient(135deg, #00ff8815, #00aa5515)",
        color: autoDJ ? "#ff6666" : queue.length > 0 || trackA ? "#00ff88" : "#444",
        fontSize: 10, fontWeight: 700, cursor: queue.length > 0 || trackA || autoDJ ? "pointer" : "default",
        textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace",
      }}>
        {autoDJ ? "■ STOP" : "▶ START"} AUTO DJ
      </button>
      <div style={{ fontSize: 9, color: "#555", textAlign: "center" }}>
        {queue.length} track{queue.length !== 1 ? "s" : ""} queued
      </div>
    </div>
  );
}
