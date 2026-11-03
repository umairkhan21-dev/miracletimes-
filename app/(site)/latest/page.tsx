import { LatestPageContent } from "@/components/LatestPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ताज़ा खबरें",
  description: "मिरेकल टाइम्स की नमूना खबरें समय के क्रम में।",
  alternates: { canonical: "/latest/" },
};

export default function LatestPage() {
  return <LatestPageContent />;
}
