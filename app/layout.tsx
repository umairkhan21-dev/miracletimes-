import { LanguageProvider } from "@/components/LanguageProvider";
import { SampleBanner } from "@/components/SampleBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SkipLink } from "@/components/SkipLink";
import { langBootScript } from "@/lib/i18n/storage";
import { sitePath } from "@/lib/paths";
import { site } from "@/lib/site";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "जन की आवाज़, जन के लिए",
    template: "%s — Miracle Times",
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name }],
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
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ea",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="hi">
      <body style={{ margin: 0 }}>
        <div lang="hi" className="site-shell">
          <script dangerouslySetInnerHTML={{ __html: langBootScript }} />
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
            <SampleBanner />
            <main id="content" className="site-main">
              {children}
            </main>
            <SiteFooter />
          </LanguageProvider>
        </div>
      </body>
    </html>
  );
}
