import { demoPath } from "@/lib/paths";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Page not found — Miracle Times" },
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        background: "#100e0c",
        color: "#f4efe6",
        textAlign: "center",
      }}
    >
      <div>
        <p style={{ letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.7 }}>
          Miracle Times
        </p>
        <h1 style={{ fontSize: "2rem", fontWeight: 600 }}>Page not found</h1>
        <p style={{ opacity: 0.75, maxWidth: "28rem" }}>
          The page you requested is unavailable. Return to the coming-soon page or open the
          sample news demo.
        </p>
        <p style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "#e24b38" }}>
            Coming soon
          </Link>
          <Link href={demoPath("/")} style={{ color: "#e24b38" }}>
            Open demo
          </Link>
        </p>
      </div>
    </main>
  );
}
