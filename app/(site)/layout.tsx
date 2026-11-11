import { LanguageProvider } from "@/components/LanguageProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SkipLink } from "@/components/SkipLink";
import { sitePath } from "@/lib/paths";
import { site } from "@/lib/site";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";

export const metadata: Metadata = {
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    title: "Miracle Times — जन की आवाज़, जन के लिए",
    description: site.description,
    url: sitePath("/"),
  },
  twitter: {
    card: "summary_large_image",
    title: "Miracle Times — जन की आवाज़, जन के लिए",
    description: site.description,
  },
  alternates: {
    canonical: sitePath("/"),
    types: {
      "application/rss+xml": sitePath("/feed.xml"),
    },
  },
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div lang="hi" className="site-shell" suppressHydrationWarning>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- runtime Google Fonts; avoids build-time next/font network dependency */}
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Serif+Devanagari:wght@600;700&display=swap"
        rel="stylesheet"
      />
      <LanguageProvider>
        <SkipLink />
        <SiteHeader />
        <main id="content" className="site-main">
          {children}
        </main>
        <SiteFooter />
      </LanguageProvider>
    </div>
  );
}
