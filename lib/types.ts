export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string };

export type Article = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: ContentBlock[];
  category: string;
  image: string;
  imageAlt: string;
  imageCaption?: string;
  imagePosition?: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  featured?: boolean;
  breaking?: boolean;
  tags?: string[];
  language?: "hi" | "en" | string;
  /** Optional per-language SEO title; fall back to title when empty. */
  seoTitle?: string;
  /** Optional per-language SEO description; fall back to summary when empty. */
  seoDescription?: string;
  /** Editorial ranking order for the most-read list. */
  demoRank?: number;
};

export type Category = {
  slug: string;
  name: string;
  english: string;
  href: string;
  description: string;
};

export type InfoLink = {
  href: string;
  label: string;
};
