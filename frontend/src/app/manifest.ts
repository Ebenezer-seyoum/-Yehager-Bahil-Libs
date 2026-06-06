import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const iconUrl =
    "https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png";

  return {
    name: "Yehager Bahil Libs",
    short_name: "Yehager Bahil",
    description: "Custom Ethiopian cultural attire",
    start_url: "/",
    display: "standalone",
    background_color: "#080808",
    theme_color: "#080808",
    icons: [
      { src: iconUrl, sizes: "192x192", type: "image/png" },
      { src: iconUrl, sizes: "512x512", type: "image/png" },
      { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
