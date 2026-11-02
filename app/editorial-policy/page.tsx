import { EditorialContent } from "@/components/LocalizedInfoPages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "संपादकीय नीति",
  description: "मिरेकल टाइम्स नमूना समाचारों को वास्तविक खबर से अलग रखने की नीति।",
  alternates: { canonical: "/editorial-policy/" },
};

export default function EditorialPolicyPage() {
  return <EditorialContent />;
}
