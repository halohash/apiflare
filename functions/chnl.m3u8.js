export async function onRequest() {
  try {
    const res = await fetch("https://hashpie.pages.dev/tracks.json");
    if (!res.ok) {
      return new Response("Failed to fetch track list", { status: 500 });
    }

    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      return new Response("TV Unavailable", { status: 500 });
    }

    const WINDOW_SIZE = 5;
    const DEFAULT_DURATION = 30;

    // simple rotating index (no fake offsets)
    const now = Math.floor(Date.now() / 1000);
    const startIndex = now % list.length;

    let playlist =
      "#EXTM3U\n" +
      "#EXT-X-VERSION:3\n" +
      "#EXT-X-TARGETDURATION:30\n" +
      `#EXT-X-MEDIA-SEQUENCE:${startIndex}\n`;

    for (let i = 0; i < WINDOW_SIZE; i++) {
      const track = list[(startIndex + i) % list.length];
      if (!track.url) continue;

      const duration = track.duration || DEFAULT_DURATION;
      const title = track.title || "Channel";

      playlist += `#EXTINF:${duration},${title}\n`;
      playlist += `${track.url}\n`;
      playlist += "#EXT-X-DISCONTINUITY\n";
    }

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
