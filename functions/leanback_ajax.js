export async function onRequest(context) {
  const { request } = context;

  try {
    const url = new URL(request.url);

    // Base target (archived YouTube Leanback AJAX)
    const targetBase = "https://web.archive.org/web/20131231162350id_/http://www.youtube.com/leanback_ajax";

    // Forward query params
    const targetUrl = new URL(targetBase);
    url.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    // Optional: enforce required params if missing
    if (!targetUrl.searchParams.has("client")) {
      targetUrl.searchParams.set("client", "lb4");
    }
    if (!targetUrl.searchParams.has("hl")) {
      targetUrl.searchParams.set("hl", "en_US");
    }

    // Fetch from archive
    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*"
      }
    });

    const contentType = response.headers.get("content-type") || "application/json";
    const body = await response.text();

    // If upstream fails, return fallback JSON
    if (!response.ok) {
      return new Response(JSON.stringify({
        error: true,
        status: response.status,
        message: "Upstream request failed"
      }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }

    // Return mirrored response
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "access-control-allow-origin": "*"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: true,
      message: err.message
    }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
