export async function onRequest(context) {
  const { request } = context;

  const upstream = "http://gdata.vidtape.lol";
  const prefix = "/tapeit";

  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors() });
  }

  const params = new URLSearchParams(url.search);
  const alt = params.get("alt");

  const upstreamParams = new URLSearchParams(params);
  upstreamParams.set("alt", "xml");

  const query = upstreamParams.toString();

  let path = url.pathname;
  if (path.startsWith(prefix)) path = path.slice(prefix.length);
  if (!path.startsWith("/")) path = "/" + path;

  const targetUrl = upstream + path + (query ? "?" + query : "");

  const upstreamRes = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body:
      request.method !== "GET" && request.method !== "HEAD"
        ? request.body
        : undefined
  });

  const callback =
    params.get("callback") ||
    params.get("jsonp") ||
    params.get("cb");

  const contentType = upstreamRes.headers.get("content-type") || "";

  function cleanUrl(u) {
    try {
      const parsed = new URL(u);

      parsed.searchParams.delete("alt");

      for (const key of [...parsed.searchParams.keys()]) {
        if (key.toLowerCase() === "xml") {
          parsed.searchParams.delete(key);
        }
      }

      let out = parsed.toString();

      out = out.replace(/\?$/, "");
      out = out.replace(/&&+/g, "&");
      out = out.replace(/\?&/, "?");

      return out;
    } catch {
      return u
        .replace(/([?&])alt=xml(&|$)/g, "$1")
        .replace(/([?&])xml(&|$)/g, "$1")
        .replace(/\?$/, "")
        .replace(/&&+/g, "&")
        .replace(/\?&/, "?");
    }
  }

  if (alt && alt.startsWith("json")) {
    let xmlTextRaw = await upstreamRes.text();

    xmlTextRaw = xmlTextRaw.replace(/<\?xml[^>]*\?>/i, "");

    const base = url.origin + prefix;

    const xmlText = xmlTextRaw
      .replace(
        /(https?:\/\/gdata\.vidtape\.lol[^\s"'<>]*)/g,
        (match) => {
          let rewritten = match
            .replace("http://gdata.vidtape.lol", base)
            .replace("https://gdata.vidtape.lol", base);

          return cleanUrl(rewritten);
        }
      )
      .replace(
        /(http:\\\/\\\/gdata\.vidtape\.lol[^"']*)/g,
        (match) => {
          let unescaped = match.replace(/\\\//g, "/");

          let rewritten = unescaped.replace(
            "http://gdata.vidtape.lol",
            base
          );

          rewritten = cleanUrl(rewritten);

          return rewritten.replace(/\//g, "\\/");
        }
      );

    function convert(xml) {
      const tagRE = /<([^\/>\s]+)([^>]*)>|<\/([^>]+)>|([^<]+)/g;

      const stack = [];
      let root = {};
      let current = root;

      function fixName(name) {
        if (name.includes(":")) {
          const parts = name.split(":");
          return parts[0] + "$" + parts[1];
        }
        return name;
      }

      function add(parent, name, value) {
        name = fixName(name);
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

          add(current, name, node);

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
      parsed = convert(xmlText);
    } catch {
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

  let body = upstreamRes.body;

  if (
    contentType.includes("text") ||
    contentType.includes("xml") ||
    contentType.includes("json")
  ) {
    let text = await upstreamRes.text();

    text = text.replace(/<\?xml[^>]*\?>/i, "");

    const base = url.origin + prefix;

    text = text
      .replace(
        /(https?:\/\/gdata\.vidtape\.lol[^\s"'<>]*)/g,
        (match) => {
          let rewritten = match
            .replace("http://gdata.vidtape.lol", base)
            .replace("https://gdata.vidtape.lol", base);

          return cleanUrl(rewritten);
        }
      )
      .replace(
        /(http:\\\/\\\/gdata\.vidtape\.lol[^"']*)/g,
        (match) => {
          let unescaped = match.replace(/\\\//g, "/");

          let rewritten = unescaped.replace(
            "http://gdata.vidtape.lol",
            base
          );

          rewritten = cleanUrl(rewritten);

          return rewritten.replace(/\//g, "\\/");
        }
      );

    body = text;
  }

  const headers = new Headers(upstreamRes.headers);

  if (!alt || alt === "xml") {
    headers.set("content-type", "application/atom+xml; charset=UTF-8");
  }

  headers.delete("content-security-policy");
  headers.delete("content-security-policy-report-only");
  headers.delete("x-frame-options");

  for (const [k, v] of Object.entries(cors())) {
    headers.set(k, v);
  }

  return new Response(body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers
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
