const { z } = require("zod");

const languageCode = z.enum(["hi", "en"]);

const contentBlockSchema = z.object({
  type: z.enum(["p", "h2"]),
  text: z.string().trim().min(1).max(20000),
});

const translationSchema = z.object({
  languageCode,
  slug: z
    .string()
    .trim()
    .min(1)
    .max(280)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "slug must be URL-safe"),
  title: z.string().trim().min(1).max(255),
  summary: z.string().trim().min(1).max(5000),
  authorDisplayName: z.string().trim().max(150).optional().nullable(),
  imageAlt: z.string().trim().max(500).optional().default(""),
  imageCaption: z.string().trim().max(500).optional().nullable(),
  imagePosition: z.string().trim().max(100).optional().nullable(),
  seoTitle: z.string().trim().max(255).optional().nullable(),
  seoDescription: z.string().trim().max(320).optional().nullable(),
  content: z.array(contentBlockSchema).min(1),
});

const articleBaseObject = z.object({
  publicId: z.string().trim().min(1).max(100),
  status: z.enum(["draft", "scheduled", "published", "archived"]).optional(),
  featured: z.boolean().optional(),
  breaking: z.boolean().optional(),
  demoRank: z.number().int().positive().nullable().optional(),
  featuredImageId: z.number().int().positive().nullable().optional(),
  authorId: z.number().int().positive().optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  categorySlugs: z.array(z.string().trim().min(1).max(120)).optional(),
  tags: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  translations: z.array(translationSchema).min(1),
});

const articleWriteSchema = articleBaseObject.refine(
  (value) =>
    (value.categoryIds && value.categoryIds.length > 0) ||
    (value.categorySlugs && value.categorySlugs.length > 0),
  { message: "At least one categoryIds or categorySlugs entry is required" },
);

const articleUpdateSchema = articleBaseObject.partial().extend({
  translations: z.array(translationSchema).min(1).optional(),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const publicListQuerySchema = z.object({
  language: languageCode.optional().default("hi"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  category: z.string().trim().max(120).optional(),
  tag: z.string().trim().max(100).optional(),
  featured: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) =>
      value === undefined ? undefined : value === true || value === "true",
    ),
  breaking: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) =>
      value === undefined ? undefined : value === true || value === "true",
    ),
  q: z.string().trim().max(200).optional(),
});

const slugParamSchema = z.object({
  slug: z.string().trim().min(1).max(280),
});

const scheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
});

const publishSchema = z.object({
  publishedAt: z.string().datetime().optional(),
});

module.exports = {
  articleWriteSchema,
  articleUpdateSchema,
  idParamSchema,
  publicListQuerySchema,
  slugParamSchema,
  scheduleSchema,
  publishSchema,
  languageCode,
};
