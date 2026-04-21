export async function onRequest({ request }) {
  const url = new URL(request.url);

  // ---- BROWSE ----
  if (url.pathname === "/youtubei/v1/browse") {
    return new Response("BROWSE HIT");
  }

  // ---- GUIDE ----
  if (url.pathname === "/youtubei/v1/guide") {
    return new Response("GUIDE HIT");
  }

  return new Response("Not found", { status: 404 });
}