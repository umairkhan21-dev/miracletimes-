import { site } from "@/lib/site";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Miracle Times — Coming Soon",
    template: "%s — Miracle Times",
  },
  description: "Miracle Times is on the way. The first edition is being prepared.",
  applicationName: site.name,
  authors: [{ name: site.name }],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: "Miracle Times — Coming Soon",
    description: "Miracle Times is on the way. The first edition is being prepared.",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Miracle Times — Coming Soon",
    description: "Miracle Times is on the way. The first edition is being prepared.",
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#100e0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
