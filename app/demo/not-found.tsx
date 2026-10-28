import { EmptyState } from "@/components/EmptyState";
import { demoPath } from "@/lib/paths";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "पेज नहीं मिला",
  robots: { index: false, follow: true },
};

export default function DemoNotFound() {
  return (
    <div className="wrap page-block">
      <EmptyState
        title="यह पेज नहीं मिला"
        message="पता बदल गया है या खबर संग्रह में नहीं है। होम या खोज से आगे बढ़ें।"
        action={{ href: demoPath("/"), label: "होम पर जाएँ" }}
        heading="h1"
      />
      <p className="not-found-search">
        <a className="btn" href={`${demoPath("/search")}/`}>
          खबर खोजें
        </a>
      </p>
    </div>
  );
}
