import { Track } from "@/types";

export const DEMO_TRACKS: Track[] = [
  { id: "1", title: "Midnight Groove", artist: "DJ Nova", bpm: 124, key: "Am", duration: 245, genre: "House", energy: 7, source: "demo" },
  { id: "2", title: "Electric Dreams", artist: "Synthwave Kid", bpm: 128, key: "Cm", duration: 312, genre: "Techno", energy: 8, source: "demo" },
  { id: "3", title: "Sunset Boulevard", artist: "Chill Master", bpm: 120, key: "F", duration: 198, genre: "Deep House", energy: 5, source: "demo" },
  { id: "4", title: "Bass Canyon", artist: "Low Frequency", bpm: 126, key: "Dm", duration: 267, genre: "Bass House", energy: 9, source: "demo" },
  { id: "5", title: "Neon Lights", artist: "Future Pulse", bpm: 130, key: "Gm", duration: 223, genre: "Progressive", energy: 6, source: "demo" },
  { id: "6", title: "Cosmic Voyage", artist: "Star Chaser", bpm: 122, key: "Bb", duration: 289, genre: "Melodic Techno", energy: 7, source: "demo" },
  { id: "7", title: "Urban Jungle", artist: "City Beats", bpm: 128, key: "Em", duration: 234, genre: "Tech House", energy: 8, source: "demo" },
  { id: "8", title: "Cloud Nine", artist: "Ethereal", bpm: 118, key: "Ab", duration: 276, genre: "Ambient House", energy: 4, source: "demo" },
  { id: "9", title: "Fire Starter", artist: "Blaze", bpm: 132, key: "Fm", duration: 201, genre: "Electro", energy: 10, source: "demo" },
  { id: "10", title: "Ocean Drive", artist: "Wave Runner", bpm: 124, key: "C", duration: 258, genre: "Tropical House", energy: 6, source: "demo" },
  { id: "11", title: "Phantom Ride", artist: "Ghost Protocol", bpm: 126, key: "Dm", duration: 241, genre: "Dark Techno", energy: 8, source: "demo" },
  { id: "12", title: "Velvet Touch", artist: "Silk Road", bpm: 120, key: "F", duration: 302, genre: "Soulful House", energy: 5, source: "demo" },
  { id: "13", title: "Afterglow", artist: "Dawn Patrol", bpm: 122, key: "Am", duration: 278, genre: "Progressive", energy: 6, source: "demo" },
  { id: "14", title: "Hyperdrive", artist: "Turbo", bpm: 134, key: "Em", duration: 195, genre: "Hard Techno", energy: 10, source: "demo" },
  { id: "15", title: "Sakura Rain", artist: "Zen Garden", bpm: 116, key: "C", duration: 330, genre: "Lo-Fi House", energy: 3, source: "demo" },
];

export const COMPATIBLE_KEYS: Record<string, string[]> = {
  "Am": ["Am", "C", "Dm", "Em", "F", "G"],
  "Cm": ["Cm", "Eb", "Fm", "Gm", "Ab", "Bb"],
  "Dm": ["Dm", "F", "Am", "Gm", "Bb", "C"],
  "Em": ["Em", "G", "Am", "Bm", "C", "D"],
  "Fm": ["Fm", "Ab", "Cm", "Bbm", "Db", "Eb"],
  "Gm": ["Gm", "Bb", "Cm", "Dm", "Eb", "F"],
  "F": ["F", "Am", "Dm", "Bb", "C", "Gm"],
  "C": ["C", "Am", "Dm", "Em", "F", "G"],
  "G": ["G", "Em", "Am", "Bm", "C", "D"],
  "Bb": ["Bb", "Gm", "Cm", "Dm", "Eb", "F"],
  "Ab": ["Ab", "Fm", "Cm", "Bbm", "Db", "Eb"],
  "Eb": ["Eb", "Cm", "Fm", "Gm", "Ab", "Bb"],
};

export const TIPS = [
  { title: "Beat Matching", icon: "🎵", text: "Match the BPMs of both decks before transitioning. Use the Sync button to auto-match!" },
  { title: "Smooth Transitions", icon: "🎚️", text: "Slowly move the crossfader while adjusting EQ. Cut bass on the incoming track, then swap." },
  { title: "Key Harmony", icon: "🔑", text: "Tracks with compatible keys blend better. Green indicators show good matches." },
  { title: "Energy Flow", icon: "⚡", text: "Build energy gradually. Don't jump from chill to intense—work up through mid-energy tracks." },
  { title: "Use Loops", icon: "🔁", text: "Loop a section to extend it while you prepare the next track." },
  { title: "EQ Mixing", icon: "🎛️", text: "Swap bass between decks during transitions. Never have full bass on both decks at once." },
];

export const AUTO_DJ_MODES = [
  { id: "smart" as const, label: "Smart Mix", desc: "Listens to the music — transitions on breakdowns and drops", icon: "🧠" },
  { id: "smooth" as const, label: "Smooth Blend", desc: "16-bar gradual crossfade with EQ bass swap", icon: "🌊" },
  { id: "drop" as const, label: "Drop Cut", desc: "Build tension then hard-cut on the drop", icon: "💥" },
  { id: "long" as const, label: "Long Mix", desc: "Slow 64-bar blend like a festival DJ", icon: "🎧" },
  { id: "echo" as const, label: "Echo Out", desc: "Echo-fade outgoing track while new one rises", icon: "🌀" },
  { id: "party" as const, label: "Quick Mix", desc: "Fast 8-bar transition, keeps the energy up", icon: "🎉" },
];
