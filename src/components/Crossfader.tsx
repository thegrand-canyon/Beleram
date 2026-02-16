"use client";

import { useDJStore } from "@/stores/djStore";

export default function Crossfader() {
  const {
    crossfader, setCrossfader, autoTrans, setAutoTrans,
    trackA, trackB, playingA, setPlayingA, playingB, setPlayingB,
    setSyncB, setEqA, setEqB, setVolA, setVolB,
    setTransitionProgress, setAutoDJStatus,
  } = useDJStore();

  const handleManualAutoMix = () => {
    if (!trackA || !trackB) return;
    if (!playingA) setPlayingA(true);
    if (!playingB) setPlayingB(true);
    setSyncB(true);
    setEqA({ hi: 50, mid: 50, lo: 50 });
    setEqB({ hi: 50, mid: 50, lo: 50 });
    setVolA(80);
    setVolB(80);
    setCrossfader(0);
    setAutoTrans(true);
  };

  const handleStopMix = () => {
    setAutoTrans(false);
    setTransitionProgress(0);
    setAutoDJStatus("");
    // Keep current crossfader/EQ/volume where they are — don't snap
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 10px", background: "linear-gradient(180deg, rgba(25,25,40,0.9), rgba(15,15,28,0.95))", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" }}>CROSSFADER</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
        <span style={{ fontSize: 9, color: "#00f0ff", fontWeight: 700 }}>A</span>
        <input type="range" min={0} max={100} value={crossfader} onChange={(e) => setCrossfader(+e.target.value)} style={{ flex: 1, height: 5, cursor: "pointer" }} />
        <span style={{ fontSize: 9, color: "#ff6ec7", fontWeight: 700 }}>B</span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {([["← A", 0, "#00f0ff"], ["MID", 50, "#8866ff"], ["B →", 100, "#ff6ec7"]] as const).map(([l, v, c]) => (
          <button key={l} onClick={() => setCrossfader(v)} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${c}33`, background: crossfader === v ? `${c}22` : "transparent", color: crossfader === v ? c : "#555", fontSize: 8, cursor: "pointer", fontWeight: 700 }}>{l}</button>
        ))}
      </div>
      {autoTrans ? (
        <button onClick={handleStopMix} style={{
          width: "100%", padding: "6px 14px", borderRadius: 6,
          border: "1px solid #ff336655",
          background: "linear-gradient(135deg, #ff336618, #ff660018)",
          color: "#ff6666", fontSize: 9, fontWeight: 700, cursor: "pointer",
          textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace",
          animation: "pulse 1.5s infinite",
        }}>
          ■ Stop Mix
        </button>
      ) : (
        <button onClick={handleManualAutoMix} disabled={!trackA || !trackB} style={{
          width: "100%", padding: "6px 14px", borderRadius: 6,
          border: `1px solid #8866ff33`,
          background: "#8866ff10",
          color: (trackA && trackB) ? "#aaa" : "#444",
          fontSize: 9, fontWeight: 700,
          cursor: (trackA && trackB) ? "pointer" : "default",
          textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace",
        }}>
          ✨ Auto Mix
        </button>
      )}
    </div>
  );
}
