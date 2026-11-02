const { z } = require("zod");

const fromUrlSchema = z.object({
  url: z.string().trim().url().max(2048),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

module.exports = { fromUrlSchema, idParamSchema, listQuerySchema };
