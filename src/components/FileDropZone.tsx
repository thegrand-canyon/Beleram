"use client";

import { useState, useCallback, useRef } from "react";

interface FileDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  loading: boolean;
}

const ACCEPTED_EXTENSIONS = [".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"];
const ACCEPTED_MIME = "audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/mp4,audio/aac,audio/*";

export default function FileDropZone({ onFilesDropped, loading }: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filterFiles = (fileList: FileList | File[]) => {
    return Array.from(fileList).filter((f) =>
      ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
  };

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
      const files = filterFiles(e.dataTransfer.files);
      if (files.length > 0) onFilesDropped(files);
    },
    [onFilesDropped]
  );

  const handleClick = () => {
    if (!loading) inputRef.current?.click();
  };

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const files = filterFiles(e.target.files);
      if (files.length > 0) onFilesDropped(files);
      e.target.value = ""; // reset so same file can be selected again
    },
    [onFilesDropped]
  );

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDrag}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDrop={handleDrop}
      style={{
        padding: "18px 14px",
        margin: "8px 14px",
        borderRadius: 8,
        border: `2px dashed ${dragOver ? "#8866ff" : "rgba(255,255,255,0.12)"}`,
        background: dragOver ? "rgba(136,102,255,0.08)" : "rgba(255,255,255,0.02)",
        textAlign: "center",
        transition: "all 0.2s",
        cursor: loading ? "wait" : "pointer",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME}
        multiple
        onChange={handleFileInput}
        style={{ display: "none" }}
      />
      {loading ? (
        <div style={{ color: "#8866ff", fontSize: 12, fontWeight: 600 }}>
          Analyzing audio...
        </div>
      ) : (
        <div style={{ color: dragOver ? "#8866ff" : "#888", fontSize: 12 }}>
          🎵 <span style={{ textDecoration: "underline", fontWeight: 600 }}>Click to upload</span> or drag & drop MP3/WAV files to add music
        </div>
      )}
    </div>
  );
}
