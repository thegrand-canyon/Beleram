"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { RGBWaveformData } from "@/audio/RGBWaveformAnalyzer";

interface WaveformProps {
  data: number[];
  rgbData?: RGBWaveformData;
  progress: number;
  color: string;
  playing: boolean;
  onSeek?: (progress: number) => void;
  hotCues?: (number | null)[];
  loopStart?: number | null;
  loopEnd?: number | null;
  zoom?: number; // 1 = full view, 2 = 2x zoom, etc.
}

export default function Waveform({ data, rgbData, progress, color, playing, onSeek, hotCues, loopStart, loopEnd, zoom = 1 }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const isDragging = useRef(false);

  // Responsive canvas sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setCanvasWidth(Math.round(w * 2));
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Zoom: calculate visible window centered on playhead
    const viewWidth = 1 / zoom; // fraction of total visible
    let viewStart = progress - viewWidth / 2;
    let viewEnd = progress + viewWidth / 2;
    if (viewStart < 0) { viewEnd -= viewStart; viewStart = 0; }
    if (viewEnd > 1) { viewStart -= (viewEnd - 1); viewEnd = 1; }
    viewStart = Math.max(0, viewStart);

    // Convert progress/positions to canvas coords within zoomed view
    const toCanvasX = (p: number) => ((p - viewStart) / viewWidth) * w;

    // Draw loop region
    if (loopStart != null && loopEnd != null) {
      const lx1 = toCanvasX(loopStart);
      const lx2 = toCanvasX(loopEnd);
      ctx.fillStyle = `${color}0a`;
      ctx.fillRect(lx1, 0, lx2 - lx1, h);
      ctx.strokeStyle = `${color}44`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(lx1, 0, lx2 - lx1, h);
      ctx.setLineDash([]);
    }

    const px = toCanvasX(progress);
    const numBars = data.length;
    const barW = Math.max(1, (w / numBars) * zoom - 1);

    if (rgbData) {
      // RGB colored waveform
      for (let i = 0; i < numBars; i++) {
        const barProgress = i / numBars;
        if (barProgress < viewStart - 1 / numBars || barProgress > viewEnd + 1 / numBars) continue;
        const x = toCanvasX(barProgress);
        const isPast = x < px;
        const alpha = isPast ? 0.85 : 0.4;

        const bassH = rgbData.bass[i] * h * 0.35;
        const midH = rgbData.mid[i] * h * 0.3;
        const hiH = rgbData.hi[i] * h * 0.25;

        const centerY = h / 2;

        // Bass (red/orange) — bottom
        ctx.fillStyle = `rgba(255,60,60,${alpha})`;
        if (isPast) { ctx.shadowBlur = 2; ctx.shadowColor = "#ff3c3c"; }
        ctx.fillRect(x, centerY, barW, bassH);
        ctx.fillRect(x, centerY - bassH, barW, bassH);

        // Mid (green) — middle
        ctx.fillStyle = `rgba(80,255,120,${alpha * 0.9})`;
        ctx.shadowColor = "#50ff78";
        const midOffset = bassH * 0.3;
        ctx.fillRect(x, centerY + midOffset, barW, midH);
        ctx.fillRect(x, centerY - midOffset - midH, barW, midH);

        // Hi (blue/cyan) — top
        ctx.fillStyle = `rgba(80,200,255,${alpha * 0.8})`;
        ctx.shadowColor = "#50c8ff";
        const hiOffset = bassH * 0.3 + midH * 0.5;
        ctx.fillRect(x, centerY + hiOffset, barW, hiH);
        ctx.fillRect(x, centerY - hiOffset - hiH, barW, hiH);

        ctx.shadowBlur = 0;
      }
    } else {
      // Monochrome waveform (fallback)
      data.forEach((v, i) => {
        const barProgress = i / numBars;
        if (barProgress < viewStart - 1 / numBars || barProgress > viewEnd + 1 / numBars) return;
        const x = toCanvasX(barProgress);
        const bh = v * h * 0.8;
        const isPast = x < px;
        ctx.fillStyle = isPast ? color + "cc" : color + "33";
        if (isPast) { ctx.shadowBlur = 2; ctx.shadowColor = color; }
        ctx.fillRect(x, (h - bh) / 2, barW, bh);
        ctx.shadowBlur = 0;
      });
    }

    // Draw hot cue markers
    if (hotCues) {
      const cueColors = ["#ff3366", "#00ff88", "#ffaa00", "#00aaff"];
      hotCues.forEach((pos, i) => {
        if (pos == null) return;
        const cx = toCanvasX(pos);
        ctx.fillStyle = cueColors[i % 4];
        ctx.beginPath();
        ctx.moveTo(cx - 4, 0);
        ctx.lineTo(cx + 4, 0);
        ctx.lineTo(cx, 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = cueColors[i % 4] + "66";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, 8);
        ctx.lineTo(cx, h);
        ctx.stroke();
      });
    }

    // Draw playhead
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 8;
    ctx.fillRect(px - 1, 0, 2, h);
    ctx.shadowBlur = 0;
  }, [data, rgbData, progress, color, playing, canvasWidth, hotCues, loopStart, loopEnd, zoom]);

  const seekFromEvent = useCallback((clientX: number) => {
    if (!onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickFrac = (clientX - rect.left) / rect.width;
    // Convert from zoomed canvas space back to track progress
    const viewWidth = 1 / zoom;
    let viewStart = progress - viewWidth / 2;
    let viewEnd = progress + viewWidth / 2;
    if (viewStart < 0) { viewEnd -= viewStart; viewStart = 0; }
    if (viewEnd > 1) { viewStart -= (viewEnd - 1); viewEnd = 1; }
    viewStart = Math.max(0, viewStart);
    const p = viewStart + clickFrac * viewWidth;
    onSeek(Math.max(0, Math.min(1, p)));
  }, [onSeek, zoom, progress]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    seekFromEvent(e.clientX);
  }, [seekFromEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    e.preventDefault();
    seekFromEvent(e.clientX);
  }, [seekFromEvent]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDragStart={(e) => e.preventDefault()}
      style={{
        position: "relative", zIndex: 2, borderRadius: 6, overflow: "hidden",
        cursor: onSeek ? "pointer" : "default", touchAction: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={110}
        style={{ width: "100%", height: 55, display: "block", background: "rgba(0,0,0,0.4)", pointerEvents: "none" }}
      />
    </div>
  );
}
