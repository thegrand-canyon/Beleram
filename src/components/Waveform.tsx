"use client";

import { useRef, useEffect } from "react";

interface WaveformProps {
  data: number[];
  progress: number;
  color: string;
  playing: boolean;
  onSeek?: (progress: number) => void;
}

export default function Waveform({ data, progress, color, playing, onSeek }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const px = progress * w;
    data.forEach((v, i) => {
      const x = (i / data.length) * w;
      const bh = v * h * 0.8;
      ctx.shadowBlur = x < px ? 2 : 0;
      ctx.shadowColor = color;
      ctx.fillStyle = x < px ? color + "cc" : color + "33";
      ctx.fillRect(x, (h - bh) / 2, Math.max(1, w / data.length - 1), bh);
    });
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 8;
    ctx.fillRect(px - 1, 0, 2, h);
    ctx.shadowBlur = 0;
  }, [data, progress, color, playing]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, p)));
  };

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={55}
      onClick={handleClick}
      onDragStart={(e) => e.preventDefault()}
      style={{ width: "100%", height: 55, borderRadius: 6, background: "rgba(0,0,0,0.4)", cursor: onSeek ? "pointer" : "default" }}
    />
  );
}
