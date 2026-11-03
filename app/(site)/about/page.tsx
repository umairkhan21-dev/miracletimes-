import { AboutContent } from "@/components/LocalizedInfoPages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "हमारे बारे में",
  description: "मिरेकल टाइम्स हिंदी का डिजिटल अखबार है, जिसका केंद्र उत्तर प्रदेश और लखनऊ है।",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  return <AboutContent />;
}
