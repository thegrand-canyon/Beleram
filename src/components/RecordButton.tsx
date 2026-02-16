"use client";

import { useRef, useEffect, useCallback } from "react";
import { useDJStore } from "@/stores/djStore";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { formatTime } from "@/lib/formatters";

export default function RecordButton() {
  const { isRecording, setIsRecording, recordingTime, setRecordingTime } = useDJStore();
  const { getEngine } = useAudioEngine();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(useDJStore.getState().recordingTime + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording, setRecordingTime]);

  const handleToggleRecording = useCallback(async () => {
    const engine = getEngine();
    if (isRecording) {
      // Stop recording and download
      const blob = await engine.stopRecordingAsync();
      setIsRecording(false);
      setRecordingTime(0);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const date = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
        a.download = `beleram-mix-${date}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } else {
      // Start recording
      await engine.resume();
      const started = engine.startRecording();
      if (started) {
        setIsRecording(true);
        setRecordingTime(0);
      }
    }
  }, [isRecording, getEngine, setIsRecording, setRecordingTime]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      padding: "8px 10px", borderRadius: 8,
      background: isRecording ? "rgba(255,50,50,0.05)" : "rgba(255,255,255,0.015)",
      border: `1px solid ${isRecording ? "#ff333344" : "rgba(255,255,255,0.04)"}`,
    }}>
      <button
        onClick={handleToggleRecording}
        style={{
          width: "100%", padding: "6px 14px", borderRadius: 6,
          border: `1px solid ${isRecording ? "#ff3333" : "#ff333355"}`,
          background: isRecording ? "#ff333322" : "#ff333308",
          color: isRecording ? "#ff6666" : "#888",
          fontSize: 9, fontWeight: 700, cursor: "pointer",
          textTransform: "uppercase", letterSpacing: 1,
          fontFamily: "'JetBrains Mono', monospace",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          animation: isRecording ? "recPulse 1.5s infinite" : "none",
        }}
      >
        <div style={{
          width: isRecording ? 8 : 10,
          height: isRecording ? 8 : 10,
          borderRadius: isRecording ? 1 : "50%",
          background: isRecording ? "#ff3333" : "#ff333388",
        }} />
        {isRecording ? "STOP & SAVE" : "REC MIX"}
      </button>
      {isRecording && (
        <div style={{
          fontSize: 11, color: "#ff6666",
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
        }}>
          {formatTime(recordingTime)}
        </div>
      )}
    </div>
  );
}
