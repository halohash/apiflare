export async function onRequest(context) {
  const { request } = context;

  const upstream = "http://gdata.vidtape.lol";
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders()
    });
  }

  const params = new URLSearchParams(url.search);

  if (!params.has("alt")) {
    params.set("alt", "xml");
  }

  const query = params.toString();
  const targetUrl =
    upstream +
    url.pathname +
    (query ? "?" + query : "");

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

  const response = await fetch(targetUrl, init);

  const alt = params.get("alt");
  const callback =
    params.get("callback") ||
    params.get("jsonp") ||
    params.get("cb");

  if (alt && alt.startsWith("json")) {
    let text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      try {
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");

        const xmlToJson = (node) => {
          const obj = {};

          if (node.nodeType === 3) return node.nodeValue.trim();

          if (node.attributes) {
            for (let attr of node.attributes) {
              obj[attr.name] = attr.value;
            }
          }

          for (let child of node.childNodes) {
            const name = child.nodeName;
            const value = xmlToJson(child);
            if (!value) continue;

            if (obj[name]) {
              if (!Array.isArray(obj[name])) obj[name] = [obj[name]];
              obj[name].push(value);
            } else {
              obj[name] = value;
            }
          }

          return obj;
        };

        data = xmlToJson(xml.documentElement);
      } catch {
        data = { raw: text };
      }
    }

    let body = JSON.stringify(data);

    if ((alt === "json-in-script" || callback) && callback) {
      body = `${callback}(${body})`;
      return new Response(body, {
        headers: {
          "content-type": "application/javascript; charset=UTF-8",
          ...corsHeaders()
        }
      });
    }

    return new Response(body, {
      headers: {
        "content-type": "application/json; charset=UTF-8",
        ...corsHeaders()
      }
    });
  }

  const responseHeaders = new Headers(response.headers);

  responseHeaders.set("content-type", "application/atom+xml; charset=UTF-8");

  responseHeaders.delete("content-security-policy");
  responseHeaders.delete("content-security-policy-report-only");
  responseHeaders.delete("x-frame-options");

  for (const [k, v] of Object.entries(corsHeaders())) {
    responseHeaders.set(k, v);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "*",
    "access-control-expose-headers": "*"
  };
}
