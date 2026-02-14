"use client";

import { useRef, useEffect } from "react";

interface KnobProps {
  value: number;
  onChange: (v: number) => void;
  label: string;
  color?: string;
  min?: number;
  max?: number;
  size?: number;
}

export default function Knob({ value, onChange, label, color = "#00f0ff", min = 0, max = 100, size = 48 }: KnobProps) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);
  const angle = ((value - min) / (max - min)) * 270 - 135;

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;
    e.preventDefault();
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = (startY.current - e.clientY) * ((max - min) / 150);
      onChange(Math.round(Math.max(min, Math.min(max, startVal.current + delta))));
    };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [onChange, min, max]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, userSelect: "none" }}>
      <div onMouseDown={handleMouseDown} style={{
        width: size, height: size, borderRadius: "50%",
        background: "radial-gradient(circle at 40% 35%, #3a3a4a, #1a1a2e)",
        border: `2px solid ${color}33`, cursor: "ns-resize", position: "relative",
        boxShadow: `0 0 ${size / 4}px ${color}22, inset 0 1px 3px rgba(0,0,0,0.5)`,
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%", width: 2, height: size * 0.35,
          background: color, borderRadius: 1, transformOrigin: "top center",
          transform: `translate(-50%, 0) rotate(${angle}deg)`, boxShadow: `0 0 6px ${color}`,
        }} />
      </div>
      <span style={{ fontSize: 9, color: "#8888aa", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 10, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
    </div>
  );
}
