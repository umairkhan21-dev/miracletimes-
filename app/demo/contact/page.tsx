import { InfoLayout } from "@/components/InfoLayout";
import { site } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "संपर्क करें",
  description: "मिरेकल टाइम्स डेस्क से संपर्क करने का पता।",
  alternates: { canonical: "/demo/contact/" },
};

export default function ContactPage() {
  return (
    <InfoLayout
      title="संपर्क करें"
      lede="संपादकीय पत्राचार ईमेल से भेजें। यह फ्रंटएंड संदेश सहेजने वाला फ़ॉर्म नहीं चलाता।"
    >
      <p>
        ईमेल: <a href={`mailto:${site.email}`}>{site.email}</a>
      </p>
      <p>स्थान: लखनऊ, उत्तर प्रदेश</p>
      <h2>किस बात के लिए लिखें</h2>
      <ul>
        <li>तथ्य की शुद्धि या स्पष्टीकरण</li>
        <li>प्रकाशन से जुड़ा सामान्य पत्र</li>
        <li>गोपनीयता से जुड़ा अनुरोध</li>
      </ul>
      <p>
        इस डेमो संस्करण में भरा हुआ वेब फ़ॉर्म कहीं दर्ज नहीं होता, इसलिए ईमेल ही संपर्क
        का रास्ता है।
      </p>
    </InfoLayout>
  );
}
