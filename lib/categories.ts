import { demoPath } from "@/lib/paths";
import type { Category, InfoLink } from "@/lib/types";

export const categories: Category[] = [
  {
    slug: "uttar-pradesh",
    name: "उत्तर प्रदेश",
    english: "Uttar Pradesh",
    href: demoPath("/category/uttar-pradesh"),
    description:
      "उत्तर प्रदेश के शहरों, कस्बों, खेती और जनसुविधाओं पर नमूना रिपोर्ट। ये कहानियाँ प्रकाशन का प्रारूप दिखाती हैं।",
  },
  {
    slug: "lucknow",
    name: "लखनऊ",
    english: "Lucknow",
    href: demoPath("/category/lucknow"),
    description:
      "लखनऊ की यातायात, बाजार, स्टेशन और शहर की सुविधाओं पर केंद्रित नमूना खबरें।",
  },
  {
    slug: "politics",
    name: "राजनीति",
    english: "Politics",
    href: demoPath("/category/politics"),
    description:
      "विधानसभा, स्थानीय निकाय और नागरिक प्रक्रियाओं पर काल्पनिक संपादकीय बुलेटिन। इनमें किसी वास्तविक बयान का दावा नहीं है।",
  },
  {
    slug: "national",
    name: "देश",
    english: "National",
    href: demoPath("/category/national"),
    description:
      "रेल, ऊर्जा और शिक्षा जैसे राष्ट्रीय विषयों पर नमूना कवरेज।",
  },
  {
    slug: "world",
    name: "दुनिया",
    english: "World",
    href: demoPath("/category/world"),
    description:
      "व्यापार और जलवायु जैसे अंतरराष्ट्रीय विषयों की संक्षिप्त नमूना खबरें।",
  },
  {
    slug: "business",
    name: "कारोबार",
    english: "Business",
    href: demoPath("/category/business"),
    description:
      "लघु उद्योग, मंडी और स्थानीय कारोबार पर नमूना आर्थिक रिपोर्ट।",
  },
  {
    slug: "education",
    name: "शिक्षा",
    english: "Education",
    href: demoPath("/category/education"),
    description:
      "परीक्षा, छात्रवृत्ति और पुस्तकालयों से जुड़ी नमूना शैक्षणिक सूचनाएँ।",
  },
  {
    slug: "crime",
    name: "अपराध",
    english: "Crime",
    href: demoPath("/category/crime"),
    description:
      "साइबर सावधानी और यातायात जांच पर जागरूकता आधारित नमूना रिपोर्ट। इनमें किसी व्यक्ति पर आरोप नहीं लगाया गया है।",
  },
  {
    slug: "technology",
    name: "टेक्नोलॉजी",
    english: "Technology",
    href: demoPath("/category/technology"),
    description:
      "डिजिटल सेवाओं और नागरिक तकनीक पर सरल नमूना व्याख्या।",
  },
  {
    slug: "sports",
    name: "खेल",
    english: "Sports",
    href: demoPath("/category/sports"),
    description:
      "स्थानीय क्रिकेट और खेल शिविरों की नमूना खेल खबरें।",
  },
  {
    slug: "entertainment",
    name: "मनोरंजन",
    english: "Entertainment",
    href: demoPath("/category/entertainment"),
    description:
      "रंगमंच, लोकगीत और सामुदायिक कार्यक्रमों की नमूना सांस्कृतिक खबरें।",
  },
  {
    slug: "health",
    name: "स्वास्थ्य",
    english: "Health",
    href: demoPath("/category/health"),
    description:
      "स्वास्थ्य शिविरों और सामान्य सावधानी की नमूना जानकारी। यह चिकित्सकीय सलाह नहीं है।",
  },
];

export const navItems = [
  { slug: "home", name: "होम", href: demoPath("/"), english: "Home" },
  ...categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    href: category.href,
    english: category.english,
  })),
];

export const infoLinks: InfoLink[] = [
  { href: demoPath("/about"), label: "हमारे बारे में" },
  { href: demoPath("/contact"), label: "संपर्क करें" },
  { href: demoPath("/privacy"), label: "गोपनीयता नीति" },
  { href: demoPath("/terms"), label: "नियम और शर्तें" },
  { href: demoPath("/editorial-policy"), label: "संपादकीय नीति" },
  { href: demoPath("/corrections"), label: "शुद्धि नीति" },
];

export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function categoryName(slug: string) {
  return getCategory(slug)?.name ?? slug;
}
