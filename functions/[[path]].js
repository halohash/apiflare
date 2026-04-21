export async function onRequest({ request }) {
  const url = new URL(request.url);

  // =========================
  // ✅ HANDLE OPTIONS FIRST
  // =========================
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    });
  }

  // =========================
  // ❗ ONLY ALLOW POST
  // =========================
  if (request.method !== "POST") {
    return new Response("Not allowed", {
      status: 405,
      headers: corsHeaders()
    });
  }

  // =========================
  // 🔍 PARSE BODY SAFELY
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

  // =========================
  // 🎬 BROWSE
  // =========================
  if (url.pathname === "/youtubei/v1/browse") {
    targetUrl = "http://yt2009.truehosting.net/youtubei/v1/browse";

    const hasValidContext =
      incoming.context?.client?.clientName === "TVHTML5";

    if (hasValidContext) {
      // ✅ Pass through
      body = { ...incoming };

      if (!body.browseId) {
        body.browseId =
          params.get("browseId") ||
          mapFeed(params.get("feed")) ||
          "default";
      }
    } else {
      // 🔧 Inject full TV payload
      body = {
        context: buildTVContext(),
        browseId:
          incoming.browseId ||
          params.get("browseId") ||
          mapFeed(params.get("feed")) ||
          "default"
      };
    }

    // continuation passthrough
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

    const hasValidContext =
      incoming.context?.client?.clientName === "TVHTML5";

    if (hasValidContext) {
      // ✅ Pass through
      body = { ...incoming };
    } else {
      // 🔧 Inject exact payload
      body = {
        context: buildTVContext()
      };
    }

    passthroughVisitor(body, incoming);
  }

  // =========================
  // ❌ UNKNOWN ROUTE
  // =========================
  else {
    return new Response("Not found", {
      status: 404,
      headers: corsHeaders()
    });
  }

  // =========================
  // 📡 HEADERS (TV CLIENT)
  // =========================
  const headers = new Headers();
  headers.set("content-type", "application/json");
  headers.set("x-youtube-client-name", "7");
  headers.set("x-youtube-client-version", "6.20180807");

  // =========================
  // 🚀 FETCH TARGET
  // =========================
  const response = await fetch(targetUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  // =========================
  // 📦 RETURN RESPONSE
  // =========================
  const responseHeaders = new Headers(response.headers);
  applyCors(responseHeaders);

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders
  });
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
