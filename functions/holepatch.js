export async function onRequest() {
  try {
    const payload = JSON.stringify({
      type: "block_upd",
      index: 162660,
      block: 24,
      seq: 0
    });

    const resp = await fetch("wss://2s4.me/m4k/", {
      headers: {
        Upgrade: "websocket"
      }
    });

    const ws = resp.webSocket;
    if (!ws) {
      return new Response("fail", { status: 400 });
    }

    ws.accept();

    ws.send(payload);
    ws.close();

    return new Response("success", { status: 200 });

  } catch (e) {
    return new Response("fail", { status: 400 });
  }
}
