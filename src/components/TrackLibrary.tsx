"use client";

import { useState } from "react";
import { Track } from "@/types";
import { COMPATIBLE_KEYS } from "@/lib/constants";
import { filterTracks } from "@/lib/trackUtils";
import { formatTime } from "@/lib/formatters";
import { useDJStore } from "@/stores/djStore";

export default function TrackLibrary() {
  const {
    tracks, addTrack, removeTrack, moveTrack, searchQuery, setSearchQuery,
    queue, addToQueue, removeFromQueue,
    trackA, trackB, loadTrack,
    showAddTrack, setShowAddTrack,
  } = useDJStore();

  const [newTrack, setNewTrack] = useState({ title: "", artist: "", bpm: 128, key: "Am", genre: "House", energy: 5 });
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [hideDemos, setHideDemos] = useState(false);

  const filtered = filterTracks(tracks, searchQuery).filter((t) => !hideDemos || t.source !== "demo");
  const currentKey = trackA?.key || trackB?.key;
  const hasDemos = tracks.some((t) => t.source === "demo");
  const hasLocal = tracks.some((t) => t.source === "local");

  const addAllFiltered = () => {
    filtered.forEach((t) => addToQueue(t));
  };

  const addCustomTrack = () => {
    if (!newTrack.title.trim()) return;
    const ct: Track = {
      ...newTrack,
      id: `custom-${Date.now()}`,
      duration: 180 + Math.floor(Math.random() * 120),
      source: "demo",
    };
    addTrack(ct);
    setNewTrack({ title: "", artist: "", bpm: 128, key: "Am", genre: "House", energy: 5 });
    setShowAddTrack(false);
  };

  const handleDragStart = (e: React.DragEvent, track: Track, idx: number) => {
    e.dataTransfer.setData("application/beleram-track-id", track.id);
    e.dataTransfer.setData("application/beleram-track-idx", String(idx));
    e.dataTransfer.effectAllowed = "copyMove";
    setDragIdx(idx);
  };

  const handleDragOverRow = (e: React.DragEvent, targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    e.preventDefault();
    // Find the real indices in the full tracks array
    const dragTrack = filtered[dragIdx];
    const targetTrack = filtered[targetIdx];
    if (!dragTrack || !targetTrack) return;
    const realDragIdx = tracks.indexOf(dragTrack);
    const realTargetIdx = tracks.indexOf(targetTrack);
    if (realDragIdx === -1 || realTargetIdx === -1) return;
    moveTrack(realDragIdx, realTargetIdx - realDragIdx);
    setDragIdx(targetIdx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  return (
    <>
      {/* Header controls */}
      <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {hasDemos && hasLocal && (
            <button onClick={() => setHideDemos(!hideDemos)} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${hideDemos ? "#ffaa0033" : "rgba(255,255,255,0.06)"}`, background: hideDemos ? "#ffaa0012" : "transparent", color: hideDemos ? "#ffaa00" : "#555", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>
              {hideDemos ? "Show Demos" : "Hide Demos"}
            </button>
          )}
          <button onClick={() => setShowAddTrack(!showAddTrack)} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #8866ff33", background: showAddTrack ? "#8866ff22" : "transparent", color: "#8866ff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>+ Add Song</button>
          <button onClick={addAllFiltered} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.06)", background: "transparent", color: "#666", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Queue All</button>
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)", color: "#ccc", fontSize: 11, outline: "none", width: 160 }} />
        </div>
      </div>

      {/* Add Track Form */}
      {showAddTrack && (
        <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(136,102,255,0.03)", display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", animation: "slideUp 0.2s ease-out" }}>
          {([["Title", "title", "Song title..."], ["Artist", "artist", "Artist name..."]] as const).map(([label, key, ph]) => (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 9, color: "#666", textTransform: "uppercase" }}>{label}</span>
              <input type="text" placeholder={ph} value={newTrack[key]} onChange={(e) => setNewTrack({ ...newTrack, [key]: e.target.value })} style={{ padding: "5px 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)", color: "#ccc", fontSize: 11, outline: "none", width: 130 }} />
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 9, color: "#666", textTransform: "uppercase" }}>BPM</span>
            <input type="number" value={newTrack.bpm} onChange={(e) => setNewTrack({ ...newTrack, bpm: +e.target.value })} style={{ padding: "5px 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)", color: "#ccc", fontSize: 11, outline: "none", width: 60 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 9, color: "#666", textTransform: "uppercase" }}>Key</span>
            <select value={newTrack.key} onChange={(e) => setNewTrack({ ...newTrack, key: e.target.value })} style={{ padding: "5px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.4)", color: "#ccc", fontSize: 11, outline: "none" }}>
              {Object.keys(COMPATIBLE_KEYS).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 9, color: "#666", textTransform: "uppercase" }}>Energy</span>
            <input type="range" min={1} max={10} value={newTrack.energy} onChange={(e) => setNewTrack({ ...newTrack, energy: +e.target.value })} style={{ width: 70, height: 4 }} />
          </div>
          <button onClick={addCustomTrack} disabled={!newTrack.title.trim()} style={{ padding: "6px 16px", borderRadius: 5, border: "1px solid #8866ff55", background: newTrack.title.trim() ? "#8866ff22" : "transparent", color: newTrack.title.trim() ? "#8866ff" : "#444", fontSize: 10, fontWeight: 700, cursor: newTrack.title.trim() ? "pointer" : "default" }}>Add</button>
        </div>
      )}

      {/* Track Table */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 4px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ color: "#444", fontSize: 9, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace" }}>
              <th style={{ padding: "7px 10px", textAlign: "left" }}>Title</th>
              <th style={{ padding: "7px", textAlign: "left" }}>Artist</th>
              <th style={{ padding: "7px", textAlign: "center" }}>BPM</th>
              <th style={{ padding: "7px", textAlign: "center" }}>Key</th>
              <th style={{ padding: "7px", textAlign: "center" }}>Energy</th>
              <th style={{ padding: "7px", textAlign: "center" }}>Time</th>
              <th style={{ padding: "7px", textAlign: "center" }}>Genre</th>
              <th style={{ padding: "7px", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, idx) => {
              const isKeyCompat = currentKey && COMPATIBLE_KEYS[currentKey]?.includes(t.key);
              const isLoaded = t.id === trackA?.id || t.id === trackB?.id;
              const inQueue = queue.find((q) => q.id === t.id);
              const isDragging = dragIdx === idx;
              return (
                <tr
                  key={t.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, t, idx)}
                  onDragOver={(e) => handleDragOverRow(e, idx)}
                  onDragEnd={handleDragEnd}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.02)",
                    opacity: isDragging ? 0.4 : isLoaded ? 0.5 : 1,
                    background: isLoaded ? "rgba(136,102,255,0.03)" : "transparent",
                    cursor: "grab",
                    transition: "opacity 0.1s",
                  }}
                  onMouseEnter={(e) => !isLoaded && (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isLoaded ? "rgba(136,102,255,0.03)" : "transparent")}
                >
                  <td style={{ padding: "7px 10px", fontWeight: 600, color: "#ddd" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, color: "#444", cursor: "grab" }}>⠿</span>
                      {t.title}
                      {t.source === "local" && <span style={{ fontSize: 8, color: "#00f0ff", padding: "1px 5px", background: "#00f0ff15", borderRadius: 3 }}>LOCAL</span>}
                      {t.source === "demo" && <span style={{ fontSize: 8, color: "#ffaa00", padding: "1px 5px", background: "#ffaa0012", borderRadius: 3 }}>DEMO</span>}
                    </div>
                  </td>
                  <td style={{ padding: "7px", color: "#888" }}>{t.artist}</td>
                  <td style={{ padding: "7px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", color: "#aaa" }}>{t.bpm}</td>
                  <td style={{ padding: "7px", textAlign: "center" }}>
                    <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", background: isKeyCompat ? "#00ff8812" : "rgba(255,255,255,0.03)", color: isKeyCompat ? "#00ff88" : "#888", border: `1px solid ${isKeyCompat ? "#00ff8822" : "transparent"}` }}>{t.key}</span>
                  </td>
                  <td style={{ padding: "7px", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: 1 }}>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} style={{ width: 3, height: 8, borderRadius: 1, background: i < t.energy ? `hsl(${120 - t.energy * 10}, 80%, 50%)` : "rgba(255,255,255,0.04)" }} />
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "7px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", color: "#666", fontSize: 10 }}>{formatTime(t.duration)}</td>
                  <td style={{ padding: "7px", textAlign: "center", color: "#666", fontSize: 10 }}>{t.genre}</td>
                  <td style={{ padding: "7px", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: 3 }}>
                      <button onClick={() => loadTrack(t, "A")} disabled={isLoaded} style={{ padding: "2px 8px", borderRadius: 3, border: "1px solid #00f0ff22", background: t.id === trackA?.id ? "#00f0ff15" : "transparent", color: t.id === trackA?.id ? "#00f0ff66" : "#00f0ff", fontSize: 9, fontWeight: 700, cursor: isLoaded ? "default" : "pointer" }}>A</button>
                      <button onClick={() => loadTrack(t, "B")} disabled={isLoaded} style={{ padding: "2px 8px", borderRadius: 3, border: "1px solid #ff6ec722", background: t.id === trackB?.id ? "#ff6ec715" : "transparent", color: t.id === trackB?.id ? "#ff6ec766" : "#ff6ec7", fontSize: 9, fontWeight: 700, cursor: isLoaded ? "default" : "pointer" }}>B</button>
                      <button onClick={() => inQueue ? removeFromQueue(t.id) : addToQueue(t)} style={{ padding: "2px 8px", borderRadius: 3, border: `1px solid ${inQueue ? "#ffaa0033" : "rgba(255,255,255,0.08)"}`, background: inQueue ? "#ffaa0015" : "transparent", color: inQueue ? "#ffaa00" : "#666", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                        {inQueue ? "−Q" : "+Q"}
                      </button>
                      <button
                        onClick={() => !isLoaded && removeTrack(t.id)}
                        disabled={isLoaded}
                        title="Remove track"
                        style={{ padding: "2px 6px", borderRadius: 3, border: "1px solid #ff336622", background: "transparent", color: isLoaded ? "#33222" : "#ff5566", fontSize: 9, fontWeight: 700, cursor: isLoaded ? "default" : "pointer", opacity: isLoaded ? 0.3 : 1 }}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
