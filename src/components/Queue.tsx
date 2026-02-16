"use client";

import { useMemo } from "react";
import { COMPATIBLE_KEYS } from "@/lib/constants";
import { useDJStore } from "@/stores/djStore";
import { smartSortQueue, getSuggestedTracks } from "@/lib/trackUtils";

export default function Queue() {
  const {
    queue, setQueue, removeFromQueue, moveInQueue, clearQueue,
    trackA, trackB, loadTrack, tracks, addToQueue,
  } = useDJStore();

  const currentKey = trackA?.key || trackB?.key;
  const reference = trackA || trackB || queue[0];

  const handleSmartSort = () => {
    if (!reference || queue.length < 2) return;
    setQueue(smartSortQueue(queue, reference));
  };

  // Build exclude set: tracks on decks + in queue
  const excludeIds = useMemo(() => {
    const ids = new Set<string>();
    if (trackA) ids.add(trackA.id);
    if (trackB) ids.add(trackB.id);
    queue.forEach((t) => ids.add(t.id));
    return ids;
  }, [trackA, trackB, queue]);

  // Get smart suggestions based on what's currently playing
  const suggestions = useMemo(() => {
    if (!reference) return [];
    return getSuggestedTracks(reference, tracks, excludeIds, 5);
  }, [reference, tracks, excludeIds]);

  return (
    <>
      <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div />
        {queue.length > 0 && (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={handleSmartSort} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #00ff8833", background: "transparent", color: "#00ff88", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>🧠 Smart Sort</button>
            <button onClick={clearQueue} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #ff336633", background: "transparent", color: "#ff5566", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Clear</button>
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Queue */}
        {queue.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#444" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Queue is Empty</div>
            <div style={{ fontSize: 11, color: "#555" }}>Add tracks from the Library or use the suggestions below</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {queue.map((t, idx) => {
              const isKeyCompat = currentKey && COMPATIBLE_KEYS[currentKey]?.includes(t.key);
              return (
                <div key={t.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8,
                  background: idx === 0 ? "rgba(136,102,255,0.06)" : "rgba(255,255,255,0.015)",
                  border: `1px solid ${idx === 0 ? "#8866ff22" : "rgba(255,255,255,0.03)"}`,
                  animation: `slideUp 0.2s ease-out ${idx * 0.03}s both`,
                }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: idx === 0 ? "#8866ff" : "#444", minWidth: 24, textAlign: "center", fontWeight: 700 }}>{idx + 1}</div>
                  {idx === 0 && <div style={{ fontSize: 8, color: "#8866ff", padding: "2px 6px", background: "#8866ff18", borderRadius: 3, fontWeight: 700 }}>NEXT</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#ddd" }}>{t.title}</div>
                    <div style={{ fontSize: 10, color: "#777" }}>{t.artist}</div>
                  </div>
                  <span style={{ fontSize: 10, color: "#888", fontFamily: "'JetBrains Mono', monospace" }}>{t.bpm}</span>
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontFamily: "'JetBrains Mono', monospace", background: isKeyCompat ? "#00ff8812" : "rgba(255,255,255,0.03)", color: isKeyCompat ? "#00ff88" : "#888" }}>{t.key}</span>
                  <div style={{ display: "flex", gap: 1 }}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} style={{ width: 2, height: 6, borderRadius: 1, background: i < t.energy ? `hsl(${120 - t.energy * 10}, 80%, 50%)` : "rgba(255,255,255,0.04)" }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 3 }}>
                    <button onClick={() => moveInQueue(idx, -1)} disabled={idx === 0} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)", background: "transparent", color: idx === 0 ? "#333" : "#888", fontSize: 10, cursor: idx === 0 ? "default" : "pointer" }}>↑</button>
                    <button onClick={() => moveInQueue(idx, 1)} disabled={idx === queue.length - 1} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)", background: "transparent", color: idx === queue.length - 1 ? "#333" : "#888", fontSize: 10, cursor: idx === queue.length - 1 ? "default" : "pointer" }}>↓</button>
                    <button onClick={() => loadTrack(t, "A")} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #00f0ff22", background: "transparent", color: "#00f0ff", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>A</button>
                    <button onClick={() => loadTrack(t, "B")} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #ff6ec722", background: "transparent", color: "#ff6ec7", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>B</button>
                    <button onClick={() => removeFromQueue(t.id)} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #ff336633", background: "transparent", color: "#ff5566", fontSize: 10, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Suggestions */}
        {reference && suggestions.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: "#8866ff", textTransform: "uppercase", letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                Suggested Next
              </div>
              <div style={{ flex: 1, height: 1, background: "rgba(136,102,255,0.15)" }} />
              <div style={{ fontSize: 9, color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>
                based on {reference.title}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {suggestions.map(({ track: t, score, reasons }) => (
                <div key={t.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8,
                  background: "rgba(136,102,255,0.02)",
                  border: `1px solid rgba(136,102,255,${Math.min(0.2, score / 500)})`,
                }}>
                  {/* Match score bar */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 30 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                      color: score >= 70 ? "#00ff88" : score >= 50 ? "#ffaa00" : "#888",
                    }}>{score}</div>
                    <div style={{
                      width: 24, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${score}%`, height: "100%", borderRadius: 2,
                        background: score >= 70 ? "#00ff88" : score >= 50 ? "#ffaa00" : "#666",
                      }} />
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#ddd" }}>{t.title}</div>
                    <div style={{ display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                      {reasons.map((r, i) => (
                        <span key={i} style={{
                          fontSize: 8, padding: "1px 5px", borderRadius: 3,
                          background: r.includes("Key") || r.includes("key") ? "#00ff8810" : r.includes("BPM") ? "#00f0ff10" : r.includes("genre") ? "#8866ff10" : "rgba(255,255,255,0.03)",
                          color: r.includes("Key") || r.includes("key") ? "#00ff88" : r.includes("BPM") ? "#00f0ff" : r.includes("genre") ? "#8866ff" : "#777",
                          border: `1px solid ${r.includes("Key") || r.includes("key") ? "#00ff8822" : "transparent"}`,
                          fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                        }}>{r}</span>
                      ))}
                    </div>
                  </div>

                  <span style={{ fontSize: 10, color: "#777" }}>{t.artist}</span>
                  <span style={{ fontSize: 10, color: "#888", fontFamily: "'JetBrains Mono', monospace" }}>{t.bpm}</span>
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontFamily: "'JetBrains Mono', monospace", background: "#00ff8812", color: "#00ff88" }}>{t.key}</span>

                  <div style={{ display: "flex", gap: 3 }}>
                    <button onClick={() => addToQueue(t)} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid #8866ff33", background: "#8866ff10", color: "#8866ff", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>+Q</button>
                    <button onClick={() => loadTrack(t, "A")} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #00f0ff22", background: "transparent", color: "#00f0ff", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>A</button>
                    <button onClick={() => loadTrack(t, "B")} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #ff6ec722", background: "transparent", color: "#ff6ec7", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>B</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
