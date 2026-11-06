import { site } from "@/lib/site";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/**
 * Served at /robots.txt (dev + static export → out/robots.txt).
 * Admin UI and search results are kept out of crawl paths.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/search/"],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
