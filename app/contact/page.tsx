import { ContactContent } from "@/components/LocalizedInfoPages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "संपर्क करें",
  description: "मिरेकल टाइम्स डेस्क से संपर्क करने का पता।",
  alternates: { canonical: "/contact/" },
};

export default function ContactPage() {
  return <ContactContent />;
}
