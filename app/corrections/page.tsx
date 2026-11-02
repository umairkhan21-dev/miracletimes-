import { CorrectionsContent } from "@/components/LocalizedInfoPages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "शुद्धि नीति",
  description: "मिरेकल टाइम्स पर सुधार कैसे माँगे जाएँ।",
  alternates: { canonical: "/corrections/" },
};

export default function CorrectionsPage() {
  return <CorrectionsContent />;
}
