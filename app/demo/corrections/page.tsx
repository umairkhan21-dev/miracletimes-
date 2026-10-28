import { InfoLayout } from "@/components/InfoLayout";
import { site } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "शुद्धि नीति",
  description: "मिरेकल टाइम्स पर सुधार कैसे माँगे जाएँ।",
  alternates: { canonical: "/demo/corrections/" },
};

export default function CorrectionsPage() {
  return (
    <InfoLayout
      title="शुद्धि नीति"
      lede="गलत तथ्य हो तो सुधार दर्ज होना चाहिए और पाठक को दिखना चाहिए कि क्या बदला।"
    >
      <p>
        जब लाइव संपादकीय व्यवस्था जुड़ेगी, महत्वपूर्ण सुधार लेख पर अपडेट समय के साथ
        दिखेंगे। स्पष्टीकरण उसी खबर के साथ रहेगा, चुपचाप मिटाया नहीं जाएगा।
      </p>
      <h2>अभी कैसे लिखें</h2>
      <p>
        इस डेमो में खबरें नमूना हैं, फिर भी किसी पाठ को लेकर पत्र{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a> पर भेजा जा सकता है। विषय में
        खबर का शीर्षक लिखें।
      </p>
      <p>पत्र में यह बताएँ कि कौन सा वाक्य गलत लगा और सही स्रोत क्या है।</p>
    </InfoLayout>
  );
}
