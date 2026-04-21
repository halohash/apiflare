export async function onRequest(context) {
  // List of image URLs
  const images = [
    "https://file.garden/aUYIWVAKvQxCBY-_/database/videos/bassie.mp4",
    "https://file.garden/aUYIWVAKvQxCBY-_/database/videos/joyshort.mp4",
    "https://file.garden/aUYIWVAKvQxCBY-_/database/videos/nexus10.mp4",
    "https://file.garden/aUYIWVAKvQxCBY-_/database/videos/Screen_Recording_20251217_125059_YouTube.mp4"
  ];

  // Pick a random image
  const randomImage = images[Math.floor(Math.random() * images.length)];

try {
    const response = await fetch(randomImage);

    // If the fetch worked but returned an error status
    if (!response.ok) {
      return new Response("Failed to fetch video", { status: 400 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "video/mp4",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    // If fetch throws (network failure, DNS, etc.)
    return new Response("<h1>dns fuckup</h1>", { status: 400 });
  }
  };