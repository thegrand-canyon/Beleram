"use client";

const STEPS = [
  { title: "Step 1: Build Your Queue", desc: "Browse the Library and click +Q to add tracks. Use 🧠 Smart Sort to automatically order by key & BPM compatibility." },
  { title: "Step 2: Choose Your Mode", desc: "Pick an Auto DJ mode: Smooth Flow for gradual mixing, Party Mode for high-energy sets, Chill Vibes for relaxed sessions, or Build Up for rising energy." },
  { title: "Step 3: Hit Auto DJ", desc: "Press START AUTO DJ and Beleram handles everything — loading tracks, syncing BPMs, matching keys, and crossfading automatically." },
  { title: "Step 4: Take Control Anytime", desc: "Want to learn manual mixing? Stop Auto DJ and use the decks yourself. Load tracks with A/B buttons, use Sync, and practice crossfading." },
  { title: "Step 5: EQ Transitions", desc: "For smooth manual mixes: cut the bass (LO knob) on the incoming track, slowly crossfade, then swap the bass between decks." },
  { title: "Pro Tip: Drop Your Own Files", desc: "Drag & drop MP3/WAV files onto the library to add your own music. Beleram will analyze BPM and generate waveforms automatically." },
];

export default function Guide() {
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#ddd" }}>🎓 Beginner DJ Guide</div>
      {STEPS.map((s, i) => (
        <div key={i} style={{ padding: 14, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", animation: `slideUp 0.2s ease-out ${i * 0.04}s both` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#8866ff", marginBottom: 4 }}>{s.title}</div>
          <div style={{ fontSize: 12, color: "#999", lineHeight: 1.5 }}>{s.desc}</div>
        </div>
      ))}
    </div>
  );
}
