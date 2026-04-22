export async function onRequest(context) {
  const { request } = context;

  const upstream = "http://gdata.vidtape.lol";
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors() });
  }

  const params = new URLSearchParams(url.search);

  if (!params.has("alt")) {
    params.set("alt", "xml");
  }

  const query = params.toString();

  const prefix = "/tapeit";

  let path = url.pathname;

  if (path.startsWith(prefix)) {
    path = path.slice(prefix.length);
  }

  if (!path.startsWith("/")) path = "/" + path;

  const targetUrl =
    upstream + path + (query ? "?" + query : "");

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

  let contentType = upstreamRes.headers.get("content-type") || "";
  let body = upstreamRes.body;

  // ===== JSON / JSONP =====
  if (alt && alt.startsWith("json")) {
    let text = await upstreamRes.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      try {
        const xml = new DOMParser().parseFromString(text, "text/xml");

        const xmlToJson = (node) => {
          if (node.nodeType === 3) return node.nodeValue.trim();

          const obj = {};

          if (node.attributes) {
            for (let attr of node.attributes) {
              obj[attr.name] = attr.value;
            }
          }

          for (let child of node.childNodes) {
            const val = xmlToJson(child);
            if (!val) continue;

            const name = child.nodeName;

            if (obj[name]) {
              if (!Array.isArray(obj[name])) obj[name] = [obj[name]];
              obj[name].push(val);
            } else {
              obj[name] = val;
            }
          }

          return obj;
        };

        data = xmlToJson(xml.documentElement);
      } catch {
        data = { raw: text };
      }
    }

    let out = JSON.stringify(data);

    if ((alt === "json-in-script" || callback) && callback) {
      out = `${callback}(${out})`;
      return new Response(out, {
        headers: {
          "content-type": "application/javascript; charset=UTF-8",
          ...cors()
        }
      });
    }

    return new Response(out, {
      headers: {
        "content-type": "application/json; charset=UTF-8",
        ...cors()
      }
    });
  }

  // ===== Rewrite URLs so they stay in /tapeit =====
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
    "access-control-allow-headers": "*"
  };
}
