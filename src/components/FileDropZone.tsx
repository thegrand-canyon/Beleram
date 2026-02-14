"use client";

import { useState, useCallback } from "react";

interface FileDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  loading: boolean;
}

const ACCEPTED = [".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"];

export default function FileDropZone({ onFilesDropped, loading }: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        ACCEPTED.some((ext) => f.name.toLowerCase().endsWith(ext))
      );
      if (files.length > 0) onFilesDropped(files);
    },
    [onFilesDropped]
  );

  return (
    <div
      onDragOver={handleDrag}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDrop={handleDrop}
      style={{
        padding: "14px",
        margin: "8px 14px",
        borderRadius: 8,
        border: `2px dashed ${dragOver ? "#8866ff" : "rgba(255,255,255,0.08)"}`,
        background: dragOver ? "rgba(136,102,255,0.08)" : "rgba(255,255,255,0.015)",
        textAlign: "center",
        transition: "all 0.2s",
        cursor: "pointer",
      }}
    >
      {loading ? (
        <div style={{ color: "#8866ff", fontSize: 12, fontWeight: 600 }}>
          Analyzing audio...
        </div>
      ) : (
        <div style={{ color: dragOver ? "#8866ff" : "#555", fontSize: 11 }}>
          🎵 Drop MP3/WAV files here to add to library
        </div>
      )}
    </div>
  );
}
