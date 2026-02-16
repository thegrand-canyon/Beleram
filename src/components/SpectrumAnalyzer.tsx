"use client";

import { useRef, useEffect, useCallback } from "react";
import { useAudioEngine } from "@/hooks/useAudioEngine";

interface SpectrumAnalyzerProps {
  side: "A" | "B";
  playing: boolean;
  hasRealAudio: boolean;
}

export default function SpectrumAnalyzer({ side, playing, hasRealAudio }: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const { getEngine } = useAudioEngine();
  const color = side === "A" ? "#00f0ff" : "#ff6ec7";

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = getEngine();
    const deck = side === "A" ? engine.deckA : engine.deckB;
    const data = deck.getSpectrumData();
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const barCount = Math.min(64, data.length);
    const barWidth = w / barCount;
    const gap = 1;

    for (let i = 0; i < barCount; i++) {
      // Use logarithmic frequency distribution
      const idx = Math.floor(Math.pow(i / barCount, 1.5) * data.length);
      const value = data[idx] / 255;
      const barHeight = value * h * 0.9;

      // Color gradient from base color to white at peak
      const brightness = Math.min(1, value * 1.5);
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      const fr = Math.round(r + (255 - r) * brightness * 0.3);
      const fg = Math.round(g + (255 - g) * brightness * 0.3);
      const fb = Math.round(b + (255 - b) * brightness * 0.3);

      ctx.fillStyle = `rgba(${fr},${fg},${fb},${0.4 + value * 0.6})`;
      ctx.fillRect(
        i * barWidth + gap / 2,
        h - barHeight,
        barWidth - gap,
        barHeight
      );
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [side, color, getEngine]);

  useEffect(() => {
    if (!playing || !hasRealAudio) {
      // Clear canvas when not playing
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, hasRealAudio, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={32}
      style={{
        width: "100%",
        height: 32,
        borderRadius: 4,
        background: "rgba(0,0,0,0.2)",
      }}
    />
  );
}
