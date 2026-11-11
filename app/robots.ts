import { site } from "@/lib/site";
import type { MetadataRoute } from "next";

/**
 * Served at /robots.txt.
 * Admin UI and search results are kept out of crawl paths.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/search/", "/api/"],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
