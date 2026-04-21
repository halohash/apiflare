export async function onRequest({ request }) {
  const url = new URL(request.url);

  // =========================
  // ✅ OPTIONS (CORS PREFLIGHT)
  // =========================
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    });
  }

  // =========================
  // ❗ ONLY POST ALLOWED
  // =========================
  if (request.method !== "POST") {
    return new Response("Not allowed", {
      status: 405,
      headers: corsHeaders()
    });
  }

  // =========================
  // 🔍 SAFE BODY PARSE
  // =========================
  let incoming = {};
  try {
    const text = await request.text();
    incoming = text ? JSON.parse(text) : {};
  } catch {
    incoming = {};
  }

  const params = url.searchParams;

  let targetUrl;
  let body;
  let type;

  // =========================
  // 🎬 BROWSE
  // =========================
  if (url.pathname === "/youtubei/v1/browse") {
    targetUrl = "http://yt2009.truehosting.net/youtubei/v1/browse";
    type = "browse";

    const hasValidContext =
      incoming.context?.client?.clientName === "TVHTML5";

    if (hasValidContext) {
      body = { ...incoming };

      if (!body.browseId) {
        body.browseId =
          params.get("browseId") ||
          mapFeed(params.get("feed")) ||
          "default";
      }
    } else {
      body = {
        context: buildTVContext(),
        browseId:
          incoming.browseId ||
          params.get("browseId") ||
          mapFeed(params.get("feed")) ||
          "default"
      };
    }

    if (incoming.continuation || params.get("continuation")) {
      body.continuation =
        incoming.continuation || params.get("continuation");
    }

    passthroughVisitor(body, incoming);
  }

  // =========================
  // 📺 GUIDE
  // =========================
  else if (url.pathname === "/youtubei/v1/guide") {
    targetUrl = "http://yt2009.truehosting.net/youtubei/v1/guide";
    type = "guide";

    const hasValidContext =
      incoming.context?.client?.clientName === "TVHTML5";

    if (hasValidContext) {
      body = { ...incoming };
    } else {
      body = {
        context: buildTVContext()
      };
    }

    passthroughVisitor(body, incoming);
  }

  // =========================
  // ❌ UNKNOWN
  // =========================
  else {
    return new Response("Not found", {
      status: 404,
      headers: corsHeaders()
    });
  }

  // =========================
  // 📡 HEADERS
  // =========================
  const headers = new Headers();
  headers.set("content-type", "application/json");
  headers.set("x-youtube-client-name", "7");
  headers.set("x-youtube-client-version", "6.20180807");

  // =========================
  // 🚀 FETCH WITH HANDLING
  // =========================
  return await fetchWithHandling(targetUrl, headers, body, type);
}

//
// =========================
// 🔧 FETCH HANDLER
// =========================
//
async function fetchWithHandling(targetUrl, headers, body, type) {
  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const responseHeaders = new Headers(response.headers);
    applyCors(responseHeaders);
    responseHeaders.set("content-type", "application/json");

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch {}

      return new Response(
        JSON.stringify(formatError(type, response.status, errorText)),
        {
          status: 502,
          headers: responseHeaders
        }
      );
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (err) {
    return new Response(
      JSON.stringify(formatError(type, 500, err?.message)),
      {
        status: 500,
        headers: {
          ...corsHeaders(),
          "content-type": "application/json"
        }
      }
    );
  }
}

//
// =========================
// ❗ ERROR FORMATS
// =========================
//
function formatError(type, status, details) {
  if (type === "guide") {
    return {
      guide_error: "Guide request failed",
      code: status,
      message: details || null
    };
  }

  return {
    error: "Browse request failed",
    status,
    details: details || null
  };
}

//
// =========================
// 🔧 HELPERS
// =========================
//
function buildTVContext() {
  return {
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
  };
}

function mapFeed(feed) {
  if (!feed) return null;

  const FEED_MAP = {
    home: "FEwhat_to_watch",
    trending: "FEtrending",
    gaming: "FEgaming",
    news: "FEnews",
    music: "FEmusic",
    subs: "FEsubscriptions",
    subscriptions: "FEsubscriptions",
    library: "FElibrary",
    history: "FEhistory"
  };

  return FEED_MAP[feed] || null;
}

function passthroughVisitor(body, incoming) {
  if (incoming.context?.client?.visitorData) {
    if (!body.context) body.context = {};
    if (!body.context.client) body.context.client = {};
    body.context.client.visitorData =
      incoming.context.client.visitorData;
  }
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "*",
    "access-control-max-age": "86400"
  };
}

function applyCors(headers) {
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "POST, OPTIONS");
  headers.set("access-control-allow-headers", "*");
}
