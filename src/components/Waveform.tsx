"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface WaveformProps {
  data: number[];
  progress: number;
  color: string;
  playing: boolean;
  onSeek?: (progress: number) => void;
  hotCues?: (number | null)[];  // positions as 0-1 fractions
  loopStart?: number | null;    // 0-1
  loopEnd?: number | null;      // 0-1
}

export default function Waveform({ data, progress, color, playing, onSeek, hotCues, loopStart, loopEnd }: WaveformProps) {
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
      if (w && w > 0) setCanvasWidth(Math.round(w * 2)); // 2x for retina
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

    // Draw loop region
    if (loopStart != null && loopEnd != null) {
      const lx1 = loopStart * w;
      const lx2 = loopEnd * w;
      ctx.fillStyle = `${color}0a`;
      ctx.fillRect(lx1, 0, lx2 - lx1, h);
      ctx.strokeStyle = `${color}44`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(lx1, 0, lx2 - lx1, h);
      ctx.setLineDash([]);
    }

    // Draw waveform bars
    const px = progress * w;
    const barW = Math.max(1, w / data.length - 1);
    data.forEach((v, i) => {
      const x = (i / data.length) * w;
      const bh = v * h * 0.8;
      const isPast = x < px;
      ctx.fillStyle = isPast ? color + "cc" : color + "33";
      if (isPast) {
        ctx.shadowBlur = 2;
        ctx.shadowColor = color;
      }
      ctx.fillRect(x, (h - bh) / 2, barW, bh);
      ctx.shadowBlur = 0;
    });

    // Draw hot cue markers
    if (hotCues) {
      const cueColors = ["#ff3366", "#00ff88", "#ffaa00", "#00aaff"];
      hotCues.forEach((pos, i) => {
        if (pos == null) return;
        const cx = pos * w;
        ctx.fillStyle = cueColors[i % 4];
        // Triangle marker at top
        ctx.beginPath();
        ctx.moveTo(cx - 4, 0);
        ctx.lineTo(cx + 4, 0);
        ctx.lineTo(cx, 8);
        ctx.closePath();
        ctx.fill();
        // Vertical line
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
  }, [data, progress, color, playing, canvasWidth, hotCues, loopStart, loopEnd]);

  const seekFromEvent = useCallback((clientX: number) => {
    if (!onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const p = (clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, p)));
  }, [onSeek]);

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
