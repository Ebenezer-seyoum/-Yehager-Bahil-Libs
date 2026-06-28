import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "https://www.yehagerbahillibs.com").replace(/\/$/, "");

const publicRoutes = [
  "/",
  "/catalog",
  "/about",
  "/care-and-info",
  "/follow-us",
  "/register",
  "/signin",
  "/upload-your-design",
  "/events",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "/" || route === "/catalog" ? "daily" : "weekly",
    priority: route === "/" ? 1 : route === "/catalog" ? 0.9 : 0.6,
  }));
}
