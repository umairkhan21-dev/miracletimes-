import { TermsContent } from "@/components/LocalizedInfoPages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "नियम और शर्तें",
  description: "मिरेकल टाइम्स वेबसाइट के उपयोग की सामान्य शर्तें।",
  alternates: { canonical: "/terms/" },
};

export default function TermsPage() {
  return <TermsContent />;
}
