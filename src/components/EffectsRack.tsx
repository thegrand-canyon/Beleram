"use client";

import { useCallback } from "react";
import { EffectParams } from "@/types";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import Knob from "./Knob";

interface EffectsRackProps {
  side: "A" | "B";
  fx: { filter: EffectParams; delay: EffectParams; reverb: EffectParams; flanger: EffectParams };
  setFx: (fx: Partial<{ filter: EffectParams; delay: EffectParams; reverb: EffectParams; flanger: EffectParams }>) => void;
}

const FX_LIST = [
  { key: "filter" as const, label: "FILTER", icon: "~", color: "#ff3366" },
  { key: "delay" as const, label: "DELAY", icon: "||", color: "#00f0ff" },
  { key: "reverb" as const, label: "REVERB", icon: "))))", color: "#8866ff" },
  { key: "flanger" as const, label: "FLANGE", icon: "~^", color: "#00ff88" },
];

export default function EffectsRack({ side, fx, setFx }: EffectsRackProps) {
  const { getEngine } = useAudioEngine();
  const color = side === "A" ? "#00f0ff" : "#ff6ec7";

  const syncEffect = useCallback((fxKey: string, params: EffectParams) => {
    const engine = getEngine();
    const deck = side === "A" ? engine.deckA : engine.deckB;
    switch (fxKey) {
      case "filter":
        deck.effects.setFilter(params.enabled, params.param, params.wetDry);
        break;
      case "delay":
        deck.effects.setDelay(params.enabled, params.param, params.wetDry);
        break;
      case "reverb":
        deck.effects.setReverb(params.enabled, params.param, params.wetDry);
        break;
      case "flanger":
        deck.effects.setFlanger(params.enabled, params.param, params.wetDry);
        break;
    }
  }, [side, getEngine]);

  const toggleEffect = useCallback((key: "filter" | "delay" | "reverb" | "flanger") => {
    const newParams = { ...fx[key], enabled: !fx[key].enabled };
    setFx({ [key]: newParams });
    syncEffect(key, newParams);
  }, [fx, setFx, syncEffect]);

  const setParam = useCallback((key: "filter" | "delay" | "reverb" | "flanger", param: number) => {
    const newParams = { ...fx[key], param };
    setFx({ [key]: newParams });
    syncEffect(key, newParams);
  }, [fx, setFx, syncEffect]);

  const setWetDry = useCallback((key: "filter" | "delay" | "reverb" | "flanger", wetDry: number) => {
    const newParams = { ...fx[key], wetDry };
    setFx({ [key]: newParams });
    syncEffect(key, newParams);
  }, [fx, setFx, syncEffect]);

  return (
    <div style={{
      display: "flex", gap: 3, padding: "6px 8px", borderRadius: 8,
      background: "rgba(255,255,255,0.015)", border: `1px solid ${color}10`,
    }}>
      {FX_LIST.map(({ key, label, color: fxColor }) => {
        const effect = fx[key];
        return (
          <div key={key} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "4px 4px", borderRadius: 6, flex: 1,
            background: effect.enabled ? `${fxColor}08` : "transparent",
            border: `1px solid ${effect.enabled ? fxColor + "33" : "transparent"}`,
          }}>
            <button
              onClick={() => toggleEffect(key)}
              style={{
                width: "100%", padding: "2px 0", borderRadius: 3, border: "none",
                background: effect.enabled ? `${fxColor}33` : "rgba(255,255,255,0.05)",
                color: effect.enabled ? fxColor : "#555",
                fontSize: 7, fontWeight: 800, cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: 1, textTransform: "uppercase",
              }}
            >
              {label}
            </button>
            <Knob
              value={effect.param}
              onChange={(v) => setParam(key, v)}
              label=""
              color={effect.enabled ? fxColor : "#444"}
              size={30}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 6, color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>D</span>
              <input
                type="range" min={0} max={100}
                value={effect.wetDry}
                onChange={(e) => setWetDry(key, +e.target.value)}
                style={{ width: 40, height: 3, cursor: "pointer" }}
              />
              <span style={{ fontSize: 6, color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>W</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
