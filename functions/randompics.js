export async function onRequest(context) {
  // List of image URLs
  const images = [
    "https://picsum.photos/800/600",
    "https://placekitten.com/800/600",
    "https://file.garden/aUYIWVAKvQxCBY-_/database/images/DirecTV_5_LNB_Slimline_2012_06_08.jpg",
    "https://file.garden/aUYIWVAKvQxCBY-_/database/images/puckett.png",
    "https://file.garden/aUYIWVAKvQxCBY-_/database/images/cmd-hue.github.io_woketv_.png"
  ];

  // Pick a random image
  const randomImage = images[Math.floor(Math.random() * images.length)];

try {
    const response = await fetch(randomImage);

    // If the fetch worked but returned an error status
    if (!response.ok) {
      return new Response("Failed to fetch image", { status: 400 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    // If fetch throws (network failure, DNS, etc.)
    return new Response("<h1>IMAGE GRAB WASN'T OK!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!</h1>", { status: 400 });
  }
  };