import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { demoPath } from "@/lib/paths";
import { site } from "@/lib/site";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    // Nested under root layout template; keep the segment title short.
    default: "खबरें, सबसे पहले",
    template: "%s — Miracle Times",
  },
  description: site.description,
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    title: "Miracle Times — खबरें, सबसे पहले",
    description: site.description,
    url: demoPath("/"),
  },
  twitter: {
    card: "summary_large_image",
    title: "Miracle Times — खबरें, सबसे पहले",
    description: site.description,
  },
  alternates: {
    canonical: demoPath("/"),
    types: {
      "application/rss+xml": demoPath("/feed.xml"),
    },
  },
  robots: { index: false, follow: true },
};

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div lang="hi" className="demo-shell">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- runtime Google Fonts; avoids build-time next/font network dependency */}
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Serif+Devanagari:wght@600;700&display=swap"
        rel="stylesheet"
      />
      <a className="skip-link" href="#content">
        सामग्री पर जाएँ
      </a>
      <SiteHeader />
      <p className="sample-banner">{site.sampleNotice}</p>
      <main id="content" className="site-main">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
