import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Track ID required" }, { status: 400 });
  }

  const res = await fetch(`https://api.spotify.com/v1/audio-features/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to get audio features" }, { status: res.status });
  }

  const data = await res.json();

  return NextResponse.json({
    bpm: Math.round(data.tempo),
    key: convertSpotifyKey(data.key, data.mode),
    energy: Math.round(data.energy * 10),
    danceability: data.danceability,
  });
}

function convertSpotifyKey(key: number, mode: number): string {
  const keys = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  if (key < 0 || key > 11) return "Am";
  const note = keys[key];
  return mode === 1 ? note : note + "m";
}
