export async function onRequest() {
  try {
    const wsResp = await fetch("wss://2s4.me/m4k/", {
      headers: {
        Upgrade: "websocket"
      }
    });

    const ws = wsResp.webSocket;
    if (!ws) {
      return new Response("fail", { status: 400 });
    }

    ws.accept();

    // Step 1: handshake
    ws.send(JSON.stringify({ type: "request_map" }));

    // wait a bit so server initializes your session
    await new Promise(r => setTimeout(r, 1500));

    // Step 2: actual payload
    ws.send(JSON.stringify({
      type: "block_upd",
      index: 162660,
      block: 24,
      seq: 0
    }));

    ws.close();

    return new Response("success", { status: 200 });

  } catch (e) {
    return new Response("fail", { status: 400 });
  }
}
