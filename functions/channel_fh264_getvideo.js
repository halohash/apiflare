export async function onRequest(context) {
  const url = new URL(context.request.url);

  const videos = [
    { id: "QNJL6nfu__Q", url: "https://file.garden/aUYIWVAKvQxCBY-_/2013tvvideos/QNJL6nfu__Q.mp4" },
    { id: "jNQXAC9IVRw", url: "https://haus.webchnl.com/memfs/4b5bb625-7942-4025-b571-dd464a8968f0.m3u8" },
    { id: "unavailable", url: "https://file.garden/aUYIWVAKvQxCBY-_/database/videos/KGO_20130226_150000_ABC_News_Good_Morning_America.mp4" }    
  ];

  const defaultId = "unavailable";

  const requestedId = url.searchParams.get("v");

  let selected = videos.find(v => v.id === requestedId);

  if (!selected) {
    selected = videos.find(v => v.id === defaultId);
  }

  return Response.redirect(selected.url, 302);
}
