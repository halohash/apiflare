export async function onRequest(context) {
  const { request } = context;

  const now = new Date();

  // Build timestamp (year fixed to 2013)
  const timestamp =
    "2013" +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0") +
    String(now.getUTCHours()).padStart(2, "0") +
    String(now.getUTCMinutes()).padStart(2, "0") +
    String(now.getUTCSeconds()).padStart(2, "0");

  const url = new URL(request.url);

  // 🔥 Strip FULL base path
const parts = url.pathname.split("/");
const base = `/${parts[1]}/${parts[2]}`; // /mirrortube/2013
let path = url.pathname.slice(base.length);

  // Normalize root
  if (!path || path === "/") {
    path = "";
  }

  const target =
    "https://web.archive.org/web/" +
    timestamp +
    "id_/http://www.youtube.com" +
    path +
    url.search;

  try {
    const res = await fetch(target, {
      headers: {
        "User-Agent":
          request.headers.get("user-agent") || "Mozilla/5.0",
      },
    });

    const headers = new Headers(res.headers);
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(res.body, {
      status: res.status,
      headers,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "fetch failed",
        target,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
