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

  const headers = new Headers(request.headers);
  headers.set("Host", new URL(upstream).host);

  const init = {
    method: request.method,
    headers,
    redirect: "manual"
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const upstreamRes = await fetch(targetUrl, init);

  const alt = params.get("alt");
  const callback =
    params.get("callback") ||
    params.get("jsonp") ||
    params.get("cb");

  const contentType = upstreamRes.headers.get("content-type") || "";

  // =========================
  // GDATA XML -> JSON
  // =========================
  if (alt && alt.startsWith("json")) {
    let text = await upstreamRes.text();

    const xml = new DOMParser().parseFromString(text, "text/xml");

    function xmlToGData(node) {
      if (node.nodeType === 3) {
        const v = node.nodeValue.trim();
        return v ? { "$t": v } : null;
      }

      const obj = {};

      if (node.attributes) {
        for (let attr of node.attributes) {
          obj[attr.name] = attr.value;
        }
      }

      let hasElementChildren = false;

      for (let child of node.childNodes) {
        if (child.nodeType === 1) {
          hasElementChildren = true;

          let name = child.nodeName;

          if (name.includes(":")) {
            const parts = name.split(":");
            name = parts[0] + "$" + parts[1];
          }

          const val = xmlToGData(child);
          if (!val) continue;

          if (obj[name]) {
            if (!Array.isArray(obj[name])) obj[name] = [obj[name]];
            obj[name].push(val);
          } else {
            obj[name] = val;
          }
        }
      }

      if (!hasElementChildren) {
        const text = node.textContent?.trim();
        if (text) obj["$t"] = text;
      }

      return obj;
    }

    let rootName = xml.documentElement.nodeName;

    if (rootName.includes(":")) {
      const parts = rootName.split(":");
      rootName = parts[0] + "$" + parts[1];
    }

    const data = {
      version: "1.0",
      encoding: "UTF-8",
      [rootName]: xmlToGData(xml.documentElement)
    };

    let body = JSON.stringify(data);

    if ((alt === "json-in-script" || callback) && callback) {
      body = `${callback}(${body})`;
      return new Response(body, {
        headers: {
          "content-type": "application/javascript; charset=UTF-8",
          ...cors()
        }
      });
    }

    return new Response(body, {
      headers: {
        "content-type": "application/json; charset=UTF-8",
        ...cors()
      }
    });
  }

  // =========================
  // TEXT / XML REWRITE
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
      .replaceAll(
        "http:\\/\\/gdata.vidtape.lol",
        base.replace(/\//g, "\\/")
      );

    body = text;
  }

  const headersOut = new Headers(upstreamRes.headers);

  if (!alt || alt === "xml") {
    headersOut.set("content-type", "application/atom+xml; charset=UTF-8");
  }

  headersOut.delete("content-security-policy");
  headersOut.delete("content-security-policy-report-only");
  headersOut.delete("x-frame-options");

  for (const [k, v] of Object.entries(cors())) {
    headersOut.set(k, v);
  }

  return new Response(body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: headersOut
  });
}

function cors() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "*",
    "access-control-allow-headers": "*",
    "access-control-expose-headers": "*"
  };
}
