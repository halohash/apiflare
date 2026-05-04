export async function onRequest() {
  try {
    const url = "wss://2s4.me/m4k/";
    const payload = JSON.stringify({
      type: "block_upd",
      index: 162660,
      block: 24,
      seq: 0
    });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Upgrade": "websocket",
        "Connection": "Upgrade"
      }
    });

    const webSocket = response.webSocket;
    if (!webSocket) {
      return new Response("fail", { status: 400 });
    }

    webSocket.accept();

    let success = false;

    webSocket.addEventListener("open", () => {
      webSocket.send(payload);
      success = true;
      webSocket.close();
    });

    webSocket.addEventListener("error", () => {
      success = false;
    });

    webSocket.addEventListener("close", () => {
      // nothing needed
    });

    // small delay to allow events to fire
    await new Promise(r => setTimeout(r, 500));

    return new Response(success ? "success" : "fail", {
      status: success ? 200 : 400
    });

  } catch (e) {
    return new Response("fail", { status: 400 });
  }
}
