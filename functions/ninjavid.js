export async function onRequest(context) {
  const url = new URL(context.request.url);
  const video = url.searchParams.get("video");

  if (!video) {
    return new Response("Missing ?video=", { status: 400 });
  }

  return new Response(`
<!DOCTYPE html>
<html>
<body style="margin:0;background:black;overflow:hidden;">

<video id="v" src="${video}" autoplay muted playsinline loop crossorigin="anonymous"
style="position:fixed;width:100vw;height:100vh;object-fit:contain;"></video>

<iframe id="ninja"
src="https://vdo.ninja/?room=CollabVideoV2&push=CollabVideoV2&autostart&cleanoutput&webcam"
style="position:fixed;top:0;left:0;width:0;height:0;border:0;"></iframe>

<script>
const video = document.getElementById("v");

video.oncanplay = async () => {
  const stream = video.captureStream();

  // Override getUserMedia so VDO.Ninja uses our video instead of webcam
  navigator.mediaDevices.getUserMedia = async () => stream;
};
</script>

</body>
</html>
`, {
    headers: { "content-type": "text/html" }
  });
}
