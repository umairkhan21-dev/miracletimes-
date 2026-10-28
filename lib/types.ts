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
  /** Sample ordering only. This is not a measured readership count. */
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
