import { site } from "@/lib/site";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "जन की आवाज़, जन के लिए",
    template: "%s — Miracle Times",
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name }],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ea",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: /lang-boot.js may set lang/data-ui-lang from
    // localStorage before React hydrates (server always defaults to hi).
    <html lang="hi" suppressHydrationWarning>
      <body style={{ margin: 0 }}>
        <Script src="/lang-boot.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
