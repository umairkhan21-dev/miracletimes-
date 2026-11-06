import { EditorialContent } from "@/components/LocalizedInfoPages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "संपादकीय नीति",
  description: "मिरेकल टाइम्स की संपादकीय नीति और रिपोर्टिंग मानक।",
  alternates: { canonical: "/editorial-policy/" },
};

export default function EditorialPolicyPage() {
  return <EditorialContent />;
}
