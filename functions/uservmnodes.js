export async function onRequest(context) {
  const targetUrl = "https://computernewb.com/uservm-control/api/nodelist"; // change this to your URL

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 5.1.1; Nexus 10 Build/LMY48I) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.84 Safari/537.36"
      }
    });

    // If the fetch fails (non-2xx status), return 400
    if (!response.ok) {
      return new Response("Resource Not Ok", { status: 400 });
    }

    // Return the fetched content
    return new Response(response.body, {
      status: response.status,
      headers: response.headers
    });

  } catch (err) {
    return new Response("squidwardinsidehouse 400 error jr.", { status: 400 });
  }
}
