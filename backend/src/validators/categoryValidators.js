const { z } = require("zod");
const { languageCode } = require("./articleValidators");

const categoryTranslationSchema = z.object({
  languageCode,
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(5000),
});

const createCategorySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  translations: z.array(categoryTranslationSchema).min(1),
});

const updateCategorySchema = createCategorySchema.partial().extend({
  translations: z.array(categoryTranslationSchema).min(1).optional(),
});

const categoryListQuerySchema = z.object({
  language: languageCode.optional().default("hi"),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  categoryListQuerySchema,
  idParamSchema,
};
