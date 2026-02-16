"use client";

import { useState } from "react";

const SECTIONS = [
  {
    title: "Getting Started",
    icon: "1",
    steps: [
      { title: "Add Your Music", desc: "Drag & drop MP3, WAV, OGG, FLAC, or M4A files onto the Library tab. Beleram auto-detects BPM, key, and generates waveforms." },
      { title: "Load Decks", desc: "Click the A or B buttons next to a track, or drag tracks directly onto a deck. Deck A is your main deck, Deck B is the incoming track." },
      { title: "Play & Preview", desc: "Hit the play button on a deck. Use the waveform to scrub through the track. The time display shows your position." },
    ],
  },
  {
    title: "Basic Mixing",
    icon: "2",
    steps: [
      { title: "Volume & Crossfader", desc: "Each deck has a VOL knob. The crossfader blends between decks — all the way left is Deck A only, right is Deck B only." },
      { title: "BPM Sync", desc: "Click SYNC on Deck B to match its tempo to Deck A. This keeps both tracks in time. Use BPM +/- for manual adjustments." },
      { title: "EQ Mixing", desc: "Use HI/MID/LO knobs to shape the sound. A pro technique: cut the LO (bass) on the incoming track, crossfade, then swap bass between decks." },
      { title: "Key Matching", desc: "The KEY indicator shows if two loaded tracks are harmonically compatible. Green = compatible keys for smooth blends." },
    ],
  },
  {
    title: "Advanced Techniques",
    icon: "3",
    steps: [
      { title: "Hot Cues", desc: "Set hot cues (1-4 buttons) at key moments — drops, breakdowns, vocals. Click to jump instantly. Right-click to clear." },
      { title: "Loops", desc: "Use the loop size buttons (1/4 to 16 beats) for auto-loops, or set IN/OUT points manually. Great for extending breakdowns during transitions." },
      { title: "Beat Jump", desc: "Use the JUMP buttons to skip forward or back by beats (1, 4, 16, 32). Perfect for quickly navigating to the right section." },
      { title: "Effects", desc: "Each deck has Filter, Delay, Reverb, and Flanger effects. Toggle them on, adjust the parameter knob, and use wet/dry to blend." },
      { title: "Key Lock", desc: "Enable KEY lock to keep the track's pitch unchanged when adjusting tempo. Essential for BPM-matching without chipmunk vocals." },
    ],
  },
  {
    title: "Auto DJ & Transitions",
    icon: "4",
    steps: [
      { title: "Build a Queue", desc: "Add tracks to the Queue tab. Use Smart Sort to automatically order by key and BPM compatibility." },
      { title: "Auto DJ Modes", desc: "Smart Mix uses beat-aware EQ transitions. Smooth is gradual, Drop does hard cuts, Long extends the blend, Echo fades out, Party is fast." },
      { title: "Manual Auto Mix", desc: "Load two tracks and click Auto Mix for a one-time automated transition. Stop Mix freezes the crossfader wherever it is." },
      { title: "Crossfader Curves", desc: "Sharp = hard cut (scratching), Linear = even fade, Smooth = equal-power (no volume dip in the middle). Choose based on your style." },
    ],
  },
  {
    title: "Pro Features",
    icon: "5",
    steps: [
      { title: "Recording", desc: "Hit REC MIX to record your set. When you stop, it downloads as a WebM file. Great for sharing mixes or reviewing your technique." },
      { title: "Sample Pads", desc: "8 pads with built-in sounds (kick, snare, clap, etc.). Right-click to load your own samples from audio files." },
      { title: "PFL / Headphone Cue", desc: "Click PFL on a deck to preview it in your headphones before the audience hears it. Essential for cueing the next track." },
      { title: "Waveform Zoom", desc: "Use the zoom slider on each deck to zoom into the waveform for precise cueing and beat-matching." },
      { title: "Master Volume", desc: "The Master knob in the center controls overall output. Watch the VU meter — if CLIP appears, lower the volume to avoid distortion." },
    ],
  },
  {
    title: "Keyboard Shortcuts",
    icon: "KB",
    steps: [
      { title: "Space", desc: "Play/Pause Deck A" },
      { title: "B", desc: "Play/Pause Deck B" },
      { title: "Left/Right Arrow", desc: "Move crossfader" },
      { title: "S", desc: "Toggle Sync on Deck B" },
      { title: "Q / L", desc: "Toggle Loop on Deck A / B" },
      { title: "1-4", desc: "Trigger Hot Cues on Deck A" },
    ],
  },
];

export default function Guide() {
  const [openSection, setOpenSection] = useState(0);

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, overflow: "auto", flex: 1 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#ddd", marginBottom: 4 }}>DJ Guide</div>
      {SECTIONS.map((section, si) => {
        const isOpen = openSection === si;
        return (
          <div key={si} style={{ borderRadius: 8, border: `1px solid ${isOpen ? "#8866ff22" : "rgba(255,255,255,0.04)"}`, overflow: "hidden" }}>
            <button
              onClick={() => setOpenSection(isOpen ? -1 : si)}
              style={{
                width: "100%", padding: "10px 14px", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                background: isOpen ? "rgba(136,102,255,0.06)" : "rgba(255,255,255,0.02)",
                color: isOpen ? "#8866ff" : "#aaa",
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                background: isOpen ? "#8866ff22" : "rgba(255,255,255,0.04)",
                fontSize: 10, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                color: isOpen ? "#8866ff" : "#666",
              }}>{section.icon}</div>
              <span style={{ fontSize: 13, fontWeight: 700, flex: 1, textAlign: "left" }}>{section.title}</span>
              <span style={{ fontSize: 12, color: "#555", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>v</span>
            </button>
            {isOpen && (
              <div style={{ padding: "8px 14px 14px", display: "flex", flexDirection: "column", gap: 8, animation: "slideUp 0.2s ease-out" }}>
                {section.steps.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 10px", borderRadius: 6, background: "rgba(255,255,255,0.015)" }}>
                    <div style={{ width: 4, borderRadius: 2, background: `#8866ff${30 + i * 15 > 99 ? "99" : (30 + i * 15).toString()}`, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 3 }}>{step.title}</div>
                      <div style={{ fontSize: 11, color: "#888", lineHeight: 1.5 }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
