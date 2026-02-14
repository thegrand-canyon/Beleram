"use client";

interface VUMeterProps {
  level: number;
  color: string;
}

export default function VUMeter({ level, color }: VUMeterProps) {
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 50 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{
          width: 3, height: 6 + i * 3, borderRadius: 1,
          background: level > (i / 10) * 100 ? (i > 8 ? "#ff3366" : i > 6 ? "#ffaa00" : color) : "rgba(255,255,255,0.06)",
          transition: "background 0.1s",
        }} />
      ))}
    </div>
  );
}
