import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    return NextResponse.json({ error: "Search failed" }, { status: res.status });
  }

  const data = await res.json();

  // Map to our track format
  const tracks = data.tracks.items.map((item: {
    id: string;
    name: string;
    artists: { name: string }[];
    duration_ms: number;
    uri: string;
    album: { images: { url: string }[] };
  }) => ({
    id: `spotify-${item.id}`,
    title: item.name,
    artist: item.artists.map((a: { name: string }) => a.name).join(", "),
    duration: Math.round(item.duration_ms / 1000),
    spotifyUri: item.uri,
    albumArt: item.album.images[item.album.images.length - 1]?.url,
    source: "spotify",
  }));

  return NextResponse.json({ tracks });
}
