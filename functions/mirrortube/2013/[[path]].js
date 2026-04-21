export async function onRequest(context) {
  const { request } = context;

  const now = new Date();

  // Build timestamp (year fixed to 2013)
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");

  const timestamp = `2013${month}${day}${hours}${minutes}${seconds}`;

  const url = new URL(request.url);

  // 🔥 Remove "/mirrortube" prefix
  let path = url.pathname.replace(/^\/mirrortube/, "");
  if (path === "/") path = "";

  const query = url.search || "";

  const target = `https://web.archive.org/web/${timestamp}id_/http://www.youtube.com${path}${query}`;

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": request.headers.get("user-agent") || "Mozilla/5.0",
      },
    });

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch archived page",
        target,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
