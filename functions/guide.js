export default {
  async fetch(request) {
    // Only allow POST
    if (request.method !== "POST") {
      return new Response("Not allowed", { status: 405 });
    }

    const targetUrl =
      "http://yt2009.truehosting.net/youtubei/v1/guide";

    // Optional: read incoming (only for visitorData passthrough)
    let incoming = {};
    try {
      const text = await request.text();
      incoming = text ? JSON.parse(text) : {};
    } catch {
      incoming = {};
    }

    // --- EXACT required payload ---
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
      }
    };

    // Optional: inject visitorData if present
    if (incoming.context?.client?.visitorData) {
      body.context.client.visitorData =
        incoming.context.client.visitorData;
    }

    // Headers
    const headers = new Headers();
    headers.set("content-type", "application/json");
    headers.set("x-youtube-client-name", "7");
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