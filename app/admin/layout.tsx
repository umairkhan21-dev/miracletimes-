import { AdminAuthProvider } from "@/lib/admin/auth";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./admin.css";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s — Miracle Times Admin",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </AdminAuthProvider>
  );
}
