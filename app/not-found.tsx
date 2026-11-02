import { DemoNotFoundContent } from "@/components/DemoNotFoundContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "पेज नहीं मिला",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <DemoNotFoundContent />;
}
