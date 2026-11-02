import { PrivacyContent } from "@/components/LocalizedInfoPages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "गोपनीयता नीति",
  description: "मिरेकल टाइम्स के इस संस्करण में डेटा और गोपनीयता का संक्षिप्त विवरण।",
  alternates: { canonical: "/privacy/" },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
