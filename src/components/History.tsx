"use client";

import { useDJStore } from "@/stores/djStore";
import { formatTime } from "@/lib/formatters";

export default function History() {
  const { history, clearHistory, loadTrack, trackA, trackB } = useDJStore();

  if (history.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#555", fontSize: 12 }}>
        No tracks played yet. Load and play tracks to see your history here.
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "0 4px" }}>
      <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <span style={{ fontSize: 10, color: "#666", fontFamily: "'JetBrains Mono', monospace" }}>
          {history.length} track{history.length !== 1 ? "s" : ""} played
        </span>
        <button onClick={clearHistory} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #ff336633", background: "transparent", color: "#ff5566", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>
          Clear
        </button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ color: "#444", fontSize: 9, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace" }}>
            <th style={{ padding: "7px 10px", textAlign: "left" }}>Time</th>
            <th style={{ padding: "7px", textAlign: "left" }}>Title</th>
            <th style={{ padding: "7px", textAlign: "left" }}>Artist</th>
            <th style={{ padding: "7px", textAlign: "center" }}>BPM</th>
            <th style={{ padding: "7px", textAlign: "center" }}>Key</th>
            <th style={{ padding: "7px", textAlign: "center" }}>Deck</th>
            <th style={{ padding: "7px", textAlign: "center" }}>Reload</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry, i) => {
            const time = new Date(entry.timestamp);
            const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const isLoaded = entry.track.id === trackA?.id || entry.track.id === trackB?.id;
            const deckColor = entry.deck === "A" ? "#00f0ff" : "#ff6ec7";
            return (
              <tr
                key={`${entry.timestamp}-${i}`}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.02)",
                  opacity: isLoaded ? 0.5 : 1,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "7px 10px", fontFamily: "'JetBrains Mono', monospace", color: "#555", fontSize: 10 }}>{timeStr}</td>
                <td style={{ padding: "7px", fontWeight: 600, color: "#ddd" }}>{entry.track.title}</td>
                <td style={{ padding: "7px", color: "#888" }}>{entry.track.artist}</td>
                <td style={{ padding: "7px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", color: "#aaa" }}>{entry.track.bpm}</td>
                <td style={{ padding: "7px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", color: "#888" }}>{entry.track.key}</td>
                <td style={{ padding: "7px", textAlign: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: deckColor }}>{entry.deck}</span>
                </td>
                <td style={{ padding: "7px", textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", gap: 3 }}>
                    <button onClick={() => loadTrack(entry.track, "A")} disabled={isLoaded} style={{ padding: "2px 8px", borderRadius: 3, border: "1px solid #00f0ff22", background: "transparent", color: isLoaded ? "#333" : "#00f0ff", fontSize: 9, fontWeight: 700, cursor: isLoaded ? "default" : "pointer" }}>A</button>
                    <button onClick={() => loadTrack(entry.track, "B")} disabled={isLoaded} style={{ padding: "2px 8px", borderRadius: 3, border: "1px solid #ff6ec722", background: "transparent", color: isLoaded ? "#333" : "#ff6ec7", fontSize: 9, fontWeight: 700, cursor: isLoaded ? "default" : "pointer" }}>B</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
