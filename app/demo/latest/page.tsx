import { CategoryPage } from "@/components/CategoryPage";
import { getArticles } from "@/lib/content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ताज़ा खबरें",
  description: "मिरेकल टाइम्स की नमूना खबरें समय के क्रम में।",
  alternates: { canonical: "/demo/latest/" },
};

export default function LatestPage() {
  return (
    <CategoryPage
      title="ताज़ा खबरें"
      description="सभी नमूना खबरें नई से पुरानी के क्रम में। पन्ने बदलकर आगे की सूची देखें।"
      articles={getArticles()}
      pageSize={6}
    />
  );
}
