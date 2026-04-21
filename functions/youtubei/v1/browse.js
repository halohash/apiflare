export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only allow POST
    if (request.method !== "POST") {
      return new Response("Not allowed", { status: 405 });
    }

    const targetUrl =
      "http://yt2009.truehosting.net/youtubei/v1/browse";

    // Read incoming body (optional)
    let incoming = {};
    try {
      const text = await request.text();
      incoming = text ? JSON.parse(text) : {};
    } catch {
      incoming = {};
    }

    const params = url.searchParams;

    // --- Build forced TVHTML5 payload ---
    const body = {
      context: {
        client: {
          clientName: "TVHTML5",
          clientVersion: "6.20180807",
          screenWidthPoints: 1774,
          screenHeightPoints: 1026,
          screenPixelDensity: 1,
          theme: "CLASSIC",
          utcOffsetMinutes: -240,
          webpSupport: false,
          animatedWebpSupport: false,
          acceptRegion: "US",
          tvAppInfo: {
            appQuality: "TV_APP_QUALITY_FULL_ANIMATION"
          }
        },
        request: {},
        user: {
          enableSafetyMode: false
        }
      },

      // --- browseId handling ---
      browseId:
        incoming.browseId ||
        params.get("browseId") ||
        "default"
    };

    // --- Optional: continuation passthrough ---
    if (incoming.continuation || params.get("continuation")) {
      body.continuation =
        incoming.continuation || params.get("continuation");
    }

    // --- Optional: merge extra fields from incoming body ---
    // (keeps things like clientScreenNonce, etc.)
    for (const key in incoming) {
      if (!(key in body)) {
        body[key] = incoming[key];
      }
    }

    // Headers
    const headers = new Headers(request.headers);
    headers.set("content-type", "application/json");

    // TV clients usually use these headers
    headers.set("x-youtube-client-name", "7"); // TVHTML5
    headers.set("x-youtube-client-version", "6.20180807");

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("access-control-allow-origin", "*");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });
  }
};