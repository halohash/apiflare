export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const video = url.searchParams.get("video");

  if (!video) {
    return new Response("Missing ?video= param", { status: 400 });
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Broadcasting Video</title>
</head>
<body style="margin:0;background:black;">
  <video id="vid" src="${video}" autoplay muted playsinline loop style="width:100vw;height:100vh;"></video>

  <script>
    const video = document.getElementById("vid");

    // Wait until video is ready
    video.oncanplay = async () => {
      const stream = video.captureStream();

      // Open VDO.Ninja with stream
      const room = "CollabVideoV2";

      const win = window.open(
        "https://vdo.ninja/?room=" + room + "&push=" + room + "&autostart&cleanoutput",
        "_blank"
      );

      // Give time for page to load, then inject stream
      setTimeout(() => {
        if (win) {
          win.postMessage({
            stream: stream
          }, "*");
        }
      }, 3000);
    };
  </script>
</body>
</html>
`;

  return new Response(html, {
    headers: {
      "content-type": "text/html"
    }
  });
}
