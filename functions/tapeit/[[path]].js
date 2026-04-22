export async function onRequest(context) {
  const { request } = context;

  const upstream = "http://gdata.vidtape.lol";
  const prefix = "/tapeit";

  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors() });
  }

  const params = new URLSearchParams(url.search);

  if (!params.has("alt")) {
    params.set("alt", "xml");
  }

  const query = params.toString();

  let path = url.pathname;
  if (path.startsWith(prefix)) path = path.slice(prefix.length);
  if (!path.startsWith("/")) path = "/" + path;

  const targetUrl = upstream + path + (query ? "?" + query : "");

  const upstreamRes = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined
  });

  const alt = params.get("alt");
  const callback =
    params.get("callback") ||
    params.get("jsonp") ||
    params.get("cb");

  const contentType = upstreamRes.headers.get("content-type") || "";

  // =========================
  // SIMPLE XML → GDATA JSON
  // =========================
  if (alt && alt.startsWith("json")) {
    const text = await upstreamRes.text();

    function convert(xml) {
      const tagRE = /<([^\/>\s]+)([^>]*)>|<\/([^>]+)>|([^<]+)/g;

      const stack = [];
      let root = {};
      let current = root;

      function addChild(parent, name, value) {
        if (name.includes(":")) {
          const parts = name.split(":");
          name = parts[0] + "$" + parts[1];
        }

        if (parent[name]) {
          if (!Array.isArray(parent[name])) parent[name] = [parent[name]];
          parent[name].push(value);
        } else {
          parent[name] = value;
        }
      }

      let match;
      while ((match = tagRE.exec(xml))) {
        if (match[1]) {
          const node = {};
          const name = match[1];

          addChild(current, name, node);

          stack.push(current);
          current = node;
        } else if (match[3]) {
          current = stack.pop() || root;
        } else if (match[4]) {
          const text = match[4].trim();
          if (text) current["$t"] = text;
        }
      }

      return root;
    }

    let parsed;
    try {
      parsed = convert(text);
    } catch (e) {
      return new Response("XML parse error", { status: 500 });
    }

    const rootKey = Object.keys(parsed)[0] || "feed";

    const data = {
      version: "1.0",
      encoding: "UTF-8",
      [rootKey]: parsed[rootKey]
    };

    let body = JSON.stringify(data);

    if ((alt === "json-in-script" || callback) && callback) {
      body = `${callback}(${body})`;
      return new Response(body, {
        headers: {
          "content-type": "application/javascript",
          ...cors()
        }
      });
    }

    return new Response(body, {
      headers: {
        "content-type": "application/json",
        ...cors()
      }
    });
  }

  // =========================
  // TEXT/XML REWRITE
  // =========================
  let body = upstreamRes.body;

  if (
    contentType.includes("text") ||
    contentType.includes("xml") ||
    contentType.includes("json")
  ) {
    let text = await upstreamRes.text();

    const base = url.origin + prefix;

    text = text
      .replaceAll("http://gdata.vidtape.lol", base)
      .replaceAll("https://gdata.vidtape.lol", base)
      .replaceAll("http:\\/\\/gdata.vidtape.lol", base.replace(/\//g, "\\/"));

    body = text;
  }

  const headers = new Headers(upstreamRes.headers);

  if (!alt || alt === "xml") {
    headers.set("content-type", "application/atom+xml; charset=UTF-8");
  }

  headers.delete("content-security-policy");
  headers.delete("x-frame-options");

  for (const [k, v] of Object.entries(cors())) {
    headers.set(k, v);
  }

  return new Response(body, {
    status: upstreamRes.status,
    headers
  });
}

function cors() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "*",
    "access-control-allow-headers": "*"
  };
}
