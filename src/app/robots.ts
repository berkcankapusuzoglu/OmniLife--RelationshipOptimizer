import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/overview",
          "/daily",
          "/weekly",
          "/exercises",
          "/insights",
          "/constraints",
          "/partner",
          "/scenarios",
          "/settings",
          "/tasks",
        ],
      },
    ],
    sitemap: "https://omnilife.app/sitemap.xml",
  };
}
