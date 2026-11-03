export type AdminRole = "admin" | "editor" | "author";

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
};

export type ArticleStatus = "draft" | "scheduled" | "published" | "archived";

export type AdminContentBlock = {
  type: "p" | "h2";
  text: string;
};

export type AdminTranslation = {
  id?: number;
  languageCode: "hi" | "en";
  slug: string;
  title: string;
  summary: string;
  authorDisplayName?: string | null;
  imageAlt?: string;
  imageCaption?: string | null;
  imagePosition?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  content: AdminContentBlock[];
};

export type AdminArticle = {
  id: number;
  publicId: string;
  status: ArticleStatus;
  featured: boolean;
  breaking: boolean;
  demoRank?: number | null;
  featuredImageId?: number | null;
  featuredImageUrl?: string | null;
  authorId?: number | null;
  authorName?: string | null;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  categories: Array<{ id: number; slug: string }>;
  tags: string[];
  translations: AdminTranslation[];
};

/** Shape returned by GET /api/articles/admin list (frontend article mapping). */
export type AdminArticleListItem = {
  id: string;
  numericId?: number;
  slug: string;
  title: string;
  summary: string;
  category: string | null;
  categories?: string[];
  author: string;
  publishedAt: string;
  updatedAt?: string;
  featured?: boolean;
  breaking?: boolean;
  status?: ArticleStatus;
  language?: string;
  tags?: string[];
  image?: string;
};

export type AdminCategory = {
  id: number;
  slug: string;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
  translations: Array<{
    id?: number;
    languageCode: "hi" | "en";
    name: string;
    description: string;
  }>;
};

export type AdminMedia = {
  id: number;
  fileUrl: string;
  storageKey?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  width?: number | null;
  height?: number | null;
  createdAt?: string;
};

export type ArticleWritePayload = {
  publicId: string;
  status?: ArticleStatus;
  featured?: boolean;
  breaking?: boolean;
  demoRank?: number | null;
  featuredImageId?: number | null;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  categoryIds?: number[];
  categorySlugs?: string[];
  tags?: string[];
  translations: AdminTranslation[];
};
