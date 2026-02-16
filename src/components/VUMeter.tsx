"use client";

import { useRef, useEffect, useState } from "react";

interface VUMeterProps {
  level: number;
  color: string;
}

export default function VUMeter({ level, color }: VUMeterProps) {
  const [peakIdx, setPeakIdx] = useState(0);
  const peakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLevel = useRef(0);

  useEffect(() => {
    const currentIdx = Math.floor((level / 100) * 10);
    if (currentIdx >= peakIdx) {
      setPeakIdx(currentIdx);
      if (peakTimer.current) clearTimeout(peakTimer.current);
      peakTimer.current = setTimeout(() => setPeakIdx(0), 1200);
    }
    prevLevel.current = level;
  }, [level, peakIdx]);

  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 50 }}>
      {Array.from({ length: 10 }).map((_, i) => {
        const active = level > (i / 10) * 100;
        const isPeak = i === peakIdx && peakIdx > 0;
        const barColor = i > 8 ? "#ff3366" : i > 6 ? "#ffaa00" : color;
        return (
          <div key={i} style={{
            width: 3, height: 6 + i * 3, borderRadius: 1,
            background: active ? barColor : isPeak ? barColor + "88" : "rgba(255,255,255,0.06)",
            transition: active ? "background 0.05s" : "background 0.15s",
            boxShadow: active && i > 7 ? `0 0 4px ${barColor}66` : "none",
          }} />
        );
      })}
    </div>
  );
}
