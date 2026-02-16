"use client";

import { useState, useCallback, useEffect } from "react";
import { Track } from "@/types";
import { useDJStore } from "@/stores/djStore";

interface SpotifyTrackResult {
  id: string;
  title: string;
  artist: string;
  duration: number;
  spotifyUri: string;
  albumArt?: string;
  source: string;
}

export default function SpotifyBrowser() {
  const [connected, setConnected] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrackResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const { addTrack, addToQueue, queue } = useDJStore();

  const handleConnect = () => {
    window.location.href = "/api/spotify/auth";
  };

  // Check if connected on mount
  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/token");
      if (res.ok) setConnected(true);
    } catch {
      // not connected
    }
  }, []);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      if (res.status === 401) {
        setConnected(false);
        setError("Session expired. Please reconnect to Spotify.");
        return;
      }
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.tracks);
    } catch {
      setError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  const addSpotifyTrack = async (result: SpotifyTrackResult) => {
    // Fetch audio features for BPM/key
    const spotifyId = result.id.replace("spotify-", "");
    let bpm = 128, key = "Am", energy = 5;
    try {
      const res = await fetch(`/api/spotify/audio-features?id=${spotifyId}`);
      if (res.ok) {
        const features = await res.json();
        bpm = features.bpm;
        key = features.key;
        energy = features.energy;
      }
    } catch {
      // use defaults
    }

    const track: Track = {
      id: result.id,
      title: result.title,
      artist: result.artist,
      bpm,
      key,
      duration: result.duration,
      genre: "Spotify",
      energy,
      source: "spotify",
      spotifyUri: result.spotifyUri,
    };

    addTrack(track);
    addToQueue(track);
  };

  if (!connected) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🎧</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#ddd", marginBottom: 6 }}>Connect Spotify</div>
        <div style={{ fontSize: 11, color: "#666", marginBottom: 16, maxWidth: 320, margin: "0 auto 16px" }}>
          Browse and add tracks from Spotify. Requires Spotify Premium for playback. For full DJ features (EQ, waveforms), use local files.
        </div>
        <button onClick={handleConnect} style={{
          padding: "10px 24px", borderRadius: 20, border: "none",
          background: "#1DB954", color: "#fff", fontSize: 12, fontWeight: 700,
          cursor: "pointer", letterSpacing: 1,
        }}>
          Connect with Spotify
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Search Spotify..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          style={{
            flex: 1, padding: "8px 14px", borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)",
            color: "#ccc", fontSize: 12, outline: "none",
          }}
        />
        <button onClick={search} disabled={searching} style={{
          padding: "8px 18px", borderRadius: 6, border: "1px solid #1DB95433",
          background: "#1DB95415", color: "#1DB954", fontSize: 11, fontWeight: 700,
          cursor: "pointer",
        }}>
          {searching ? "..." : "Search"}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: "#ff5566", padding: "6px 10px", borderRadius: 5, background: "#ff336610" }}>{error}</div>
      )}

      <div style={{ flex: 1, overflow: "auto" }}>
        {results.length === 0 && !searching && (
          <div style={{ textAlign: "center", padding: 30, color: "#444", fontSize: 12 }}>
            Search for tracks on Spotify to add them to your library
          </div>
        )}
        {results.map((t) => {
          const inQueue = queue.find((q) => q.id === t.id);
          return (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
              borderBottom: "1px solid rgba(255,255,255,0.02)",
            }}>
              {t.albumArt && (
                <img src={t.albumArt} alt="" width={32} height={32} style={{ borderRadius: 4 }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#ddd" }}>{t.title}</div>
                <div style={{ fontSize: 10, color: "#777" }}>{t.artist}</div>
              </div>
              <span style={{ fontSize: 10, color: "#666", fontFamily: "'JetBrains Mono', monospace" }}>
                {Math.floor(t.duration / 60)}:{(t.duration % 60).toString().padStart(2, "0")}
              </span>
              <button
                onClick={() => !inQueue && addSpotifyTrack(t)}
                disabled={!!inQueue}
                style={{
                  padding: "4px 10px", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: inQueue ? "default" : "pointer",
                  border: `1px solid ${inQueue ? "#1DB95433" : "#1DB95455"}`,
                  background: inQueue ? "#1DB95415" : "transparent",
                  color: inQueue ? "#1DB95488" : "#1DB954",
                }}
              >
                {inQueue ? "Added" : "+ Add"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
