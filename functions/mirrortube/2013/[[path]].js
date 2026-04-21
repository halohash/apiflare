export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // ===== Timestamp (2013 + current month/day/time) =====
  const now = new Date();
  const timestamp =
    "2013" +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0") +
    String(now.getUTCHours()).padStart(2, "0") +
    String(now.getUTCMinutes()).padStart(2, "0") +
    String(now.getUTCSeconds()).padStart(2, "0");

  // ===== Strip base path (/mirrortube/2013) =====
  const base = "/mirrortube/2013";
  let path = url.pathname.startsWith(base)
    ? url.pathname.slice(base.length)
    : url.pathname;

  if (!path || path === "/") path = "";

  // ===== Target Wayback URL =====
  const target =
    `https://web.archive.org/web/${timestamp}id_/http://www.youtube.com` +
    path +
    url.search;

  let res;
  try {
    res = await fetch(target, {
      headers: {
        "User-Agent": request.headers.get("user-agent") || "Mozilla/5.0",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "fetch failed", target }),
      { status: 500 }
    );
  }

  // ===== Clone headers + remove blockers =====
  const headers = new Headers(res.headers);

  headers.delete("content-security-policy");
  headers.delete("content-security-policy-report-only");
  headers.delete("x-frame-options");
  headers.delete("x-content-type-options");

  headers.set("access-control-allow-origin", "*");

  const contentType = headers.get("content-type") || "";

  // ===== HTML Rewriting =====
  if (contentType.includes("text/html")) {
    let text = await res.text();

    // 🔥 Remove Wayback toolbar
    text = text.replace(/<script[^>]*archive\.org[^>]*><\/script>/gi, "");
    text = text.replace(/<div id="wm-ipp".*?<\/div>/gis, "");

    // 🔁 Rewrite Wayback absolute URLs → your mirror
    text = text.replace(
      /https:\/\/web\.archive\.org\/web\/\d+id_\/http:\/\/www\.youtube\.com/gi,
      "/mirrortube/2013"
    );

    // 🔁 Rewrite protocol-relative
    text = text.replace(
      /\/\/web\.archive\.org\/web\/\d+id_\/http:\/\/www\.youtube\.com/gi,
      "/mirrortube/2013"
    );

    // 🔁 Rewrite direct YouTube links
    text = text.replace(
      /https?:\/\/www\.youtube\.com/gi,
      "/mirrortube/2013"
    );

    // 🔁 Fix relative links (href="/...")
    text = text.replace(
      /href="\//gi,
      'href="/mirrortube/2013/'
    );

    text = text.replace(
      /src="\//gi,
      'src="/mirrortube/2013/'
    );

    return new Response(text, {
      status: res.status,
      headers,
    });
  }

  // ===== Non-HTML (CSS, JS, images, etc.) =====
  return new Response(res.body, {
    status: res.status,
    headers,
  });
}
