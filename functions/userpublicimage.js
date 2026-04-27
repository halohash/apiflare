export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "POST") {
    try {
      const { url } = await request.json();

      if (!url || !/^https?:\/\/.*\.(png|jpg|jpeg)$/i.test(url)) {
        return new Response("Invalid image URL", { status: 400 });
      }

      await env.IMAGES.put("default", url);

      return new Response("Image saved", { status: 200 });
    } catch {
      return new Response("Bad request", { status: 400 });
    }
  }

  if (request.method === "GET") {
    const imageUrl = await env.IMAGES.get("default");

    if (!imageUrl) {
      return new Response("No image set", { status: 404 });
    }

    try {
      const imageResponse = await fetch(imageUrl);

      if (!imageResponse.ok) {
        return new Response("Failed to fetch image", { status: 502 });
      }

      return new Response(imageResponse.body, {
        headers: {
          "Content-Type": imageResponse.headers.get("Content-Type") || "image/png",
          "Cache-Control": "public, max-age=3600"
        }
      });
    } catch {
      return new Response("Error fetching image", { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
