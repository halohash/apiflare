export async function onRequest() {
  try {
    // 🔁 CHANGE THIS if you want local instead:
    const res = await fetch("https://hashpie.pages.dev/tracks.json");
    if (!res.ok) {
      return new Response("Failed to fetch track list", { status: 500 });
    }

    let list = await res.json();

    if (!Array.isArray(list)) {
      return new Response("TV Unvailable", { status: 500 });
    }

    // 🌀 Shuffle (Fisher-Yates)
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    // 🔊 Build M3U8
    let playlist = "#EXTM3U\n#EXT-X-VERSION:3\n";

    // 🔁 Repeat tracks to simulate "infinite TV"
    const REPEATS = 512; // increase for longer playlists

    for (let r = 0; r < REPEATS; r++) {
      for (const track of list) {
        if (!track.url) continue;

        const title = track.title || "Unknown";
        playlist += `#EXTINF\n`;
        playlist += `${track.url}\n`;
      }
    }

    // ❌ Do NOT add #EXT-X-ENDLIST → keeps it "live-like"

    return new Response(playlist, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response("teapot moment", { status: 418 });
  }
}