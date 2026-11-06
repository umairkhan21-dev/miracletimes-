import { DisclaimerContent } from "@/components/LocalizedInfoPages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "अस्वीकरण",
  description:
    "मिरेकल टाइम्स अस्वीकरण — सामग्री सामान्य सूचना के लिए है।",
  alternates: { canonical: "/disclaimer/" },
};

export default function DisclaimerPage() {
  return <DisclaimerContent />;
}
