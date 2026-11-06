const { query, withTransaction } = require("../config/database");
const { AppError } = require("../utils/AppError");
const { toIsoString, toMysqlDatetime } = require("../utils/datetime");
const { parsePagination, paginationMeta } = require("../utils/pagination");

const PUBLISHED_WHERE = `a.status = 'published'
  AND a.published_at IS NOT NULL
  AND a.published_at <= UTC_TIMESTAMP()`;

/** Roles allowed to publish, schedule, archive, or set publication fields. */
const PUBLICATION_ROLES = new Set(["admin", "editor"]);

/** Statuses authors may mutate (content or metadata). */
const AUTHOR_EDITABLE_STATUSES = new Set(["draft"]);

function canManagePublication(actor) {
  return Boolean(actor && PUBLICATION_ROLES.has(actor.role));
}

/**
 * Authors may create/edit draft content they own, but must not publish,
 * schedule, archive, or set editorial publication fields via create/update.
 */
function assertPublicationWriteAllowed(payload, actor) {
  if (canManagePublication(actor)) return;

  const denied = [];
  if (payload.status !== undefined && payload.status !== "draft") {
    denied.push("status");
  }
  if (payload.publishedAt !== undefined && payload.publishedAt !== null) {
    denied.push("publishedAt");
  }
  if (payload.scheduledAt !== undefined && payload.scheduledAt !== null) {
    denied.push("scheduledAt");
  }
  if (payload.featured === true) denied.push("featured");
  if (payload.breaking === true) denied.push("breaking");
  if (payload.demoRank !== undefined && payload.demoRank !== null) {
    denied.push("demoRank");
  }
  if (payload.authorId !== undefined) denied.push("authorId");

  if (denied.length) {
    throw new AppError(
      "Authors cannot publish or set privileged publication fields",
      403,
      { code: "FORBIDDEN", details: { fields: denied } },
    );
  }
}

function assertAdminArticleAccess(articleRow, actor) {
  if (!actor) {
    throw new AppError("Authentication required", 401, { code: "UNAUTHORIZED" });
  }
  if (actor.role === "author") {
    if (Number(articleRow.author_id) !== Number(actor.id)) {
      throw new AppError("Authors can only access their own articles", 403, {
        code: "FORBIDDEN",
      });
    }
  }
}

/**
 * Authors may only mutate articles that are still drafts (owned, checked separately).
 * Blocks title/body/SEO/image/category and every other field once published/scheduled.
 */
function assertAuthorMayMutateArticle(articleRow, actor) {
  if (!actor || actor.role !== "author") return;
  const status = String(articleRow.status || "");
  if (!AUTHOR_EDITABLE_STATUSES.has(status)) {
    throw new AppError(
      "Authors can only edit draft articles",
      403,
      { code: "FORBIDDEN", details: { status } },
    );
  }
}

function assertCanManagePublication(actor) {
  if (!canManagePublication(actor)) {
    throw new AppError("Insufficient permissions", 403, { code: "FORBIDDEN" });
  }
}

function mapFrontendArticle(row, blocks = [], tags = []) {
  return {
    id: row.public_id,
    numericId: Number(row.id),
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    content: blocks.map((block) => ({
      type: block.block_type,
      text: block.content,
    })),
    category: row.primary_category_slug || null,
    categories: row.category_slugs
      ? String(row.category_slugs).split(",").filter(Boolean)
      : row.primary_category_slug
        ? [row.primary_category_slug]
        : [],
    image: row.file_url || "",
    imageAlt: row.image_alt || "",
    imageCaption: row.image_caption || undefined,
    imagePosition: row.image_position || undefined,
    author: row.author_display_name || row.author_name || "Miracle Times Desk",
    publishedAt: toIsoString(row.published_at),
    updatedAt: toIsoString(row.updated_at) || undefined,
    featured: Boolean(row.featured),
    breaking: Boolean(row.breaking),
    tags: tags.length ? tags : row.tag_names
      ? String(row.tag_names).split(",").filter(Boolean)
      : [],
    demoRank: row.demo_rank == null ? undefined : Number(row.demo_rank),
    status: row.status,
    language: row.language_code,
    seoTitle: row.seo_title || undefined,
    seoDescription: row.seo_description || undefined,
  };
}

async function loadBlocks(translationIds) {
  if (!translationIds.length) return new Map();
  const placeholders = translationIds.map(() => "?").join(",");
  const rows = await query(
    `SELECT translation_id, position, block_type, content
     FROM article_content_blocks
     WHERE translation_id IN (${placeholders})
     ORDER BY position ASC`,
    translationIds,
  );
  const map = new Map();
  for (const row of rows) {
    const key = Number(row.translation_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

async function loadTags(articleIds) {
  if (!articleIds.length) return new Map();
  const placeholders = articleIds.map(() => "?").join(",");
  const rows = await query(
    `SELECT at.article_id, t.name
     FROM article_tags at
     INNER JOIN tags t ON t.id = at.tag_id
     WHERE at.article_id IN (${placeholders})
     ORDER BY t.name ASC`,
    articleIds,
  );
  const map = new Map();
  for (const row of rows) {
    const key = Number(row.article_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row.name);
  }
  return map;
}

const listSelect = `
  SELECT
    a.id, a.public_id, a.status, a.featured, a.breaking, a.demo_rank,
    a.published_at, a.scheduled_at, a.created_at, a.updated_at,
    t.id AS translation_id, t.language_code, t.slug, t.title, t.summary,
    t.author_display_name, t.image_alt, t.image_caption, t.image_position,
    t.seo_title, t.seo_description,
    m.file_url,
    u.name AS author_name,
    (
      SELECT c.slug
      FROM article_categories ac
      INNER JOIN categories c ON c.id = ac.category_id
      WHERE ac.article_id = a.id
      ORDER BY c.display_order ASC, c.id ASC
      LIMIT 1
    ) AS primary_category_slug,
    (
      SELECT GROUP_CONCAT(c.slug ORDER BY c.display_order ASC, c.id ASC SEPARATOR ',')
      FROM article_categories ac
      INNER JOIN categories c ON c.id = ac.category_id
      WHERE ac.article_id = a.id
    ) AS category_slugs,
    (
      SELECT GROUP_CONCAT(tg.name ORDER BY tg.name ASC SEPARATOR ',')
      FROM article_tags atg
      INNER JOIN tags tg ON tg.id = atg.tag_id
      WHERE atg.article_id = a.id
    ) AS tag_names
  FROM articles a
  INNER JOIN article_translations t
    ON t.article_id = a.id AND t.language_code = :language
  LEFT JOIN media m ON m.id = a.featured_image_id
  LEFT JOIN users u ON u.id = a.author_id
`;

async function hydrateArticles(rows, { includeContent = false } = {}) {
  const translationIds = rows.map((row) => Number(row.translation_id));
  const articleIds = rows.map((row) => Number(row.id));
  const blocksMap = includeContent
    ? await loadBlocks(translationIds)
    : new Map();
  const tagsMap = await loadTags(articleIds);

  return rows.map((row) =>
    mapFrontendArticle(
      row,
      blocksMap.get(Number(row.translation_id)) || [],
      tagsMap.get(Number(row.id)) || [],
    ),
  );
}

async function listPublishedArticles({
  language = "hi",
  page = 1,
  limit = 20,
  categorySlug,
  tag,
  featured,
  breaking,
  search,
  includeContent = false,
} = {}) {
  const pagination = parsePagination({ page, limit });
  const where = [PUBLISHED_WHERE];
  const params = { language };

  if (categorySlug) {
    where.push(`EXISTS (
      SELECT 1 FROM article_categories ac
      INNER JOIN categories c ON c.id = ac.category_id
      WHERE ac.article_id = a.id AND c.slug = :categorySlug AND c.is_active = 1
    )`);
    params.categorySlug = categorySlug;
  }

  if (tag) {
    where.push(`EXISTS (
      SELECT 1 FROM article_tags atg
      INNER JOIN tags tg ON tg.id = atg.tag_id
      WHERE atg.article_id = a.id AND tg.name = :tag
    )`);
    params.tag = tag;
  }

  if (featured === true) {
    where.push("a.featured = 1");
  }
  if (breaking === true) {
    where.push("a.breaking = 1");
  }

  if (search) {
    where.push(`(
      t.title LIKE :search
      OR t.summary LIKE :search
      OR t.author_display_name LIKE :search
      OR EXISTS (
        SELECT 1 FROM article_content_blocks b
        WHERE b.translation_id = t.id AND b.content LIKE :search
      )
      OR EXISTS (
        SELECT 1 FROM article_tags atg
        INNER JOIN tags tg ON tg.id = atg.tag_id
        WHERE atg.article_id = a.id AND tg.name LIKE :search
      )
    )`);
    params.search = `%${search}%`;
  }

  const whereSql = where.join(" AND ");
  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM articles a
     INNER JOIN article_translations t
       ON t.article_id = a.id AND t.language_code = :language
     WHERE ${whereSql}`,
    params,
  );

  const rows = await query(
    `${listSelect}
     WHERE ${whereSql}
     ORDER BY a.published_at DESC, a.id DESC
     LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
    params,
  );

  const articles = await hydrateArticles(rows, { includeContent });
  return {
    articles,
    meta: paginationMeta(Number(countRows[0].total), pagination.page, pagination.limit),
  };
}

async function getPublishedBySlug(slug, language = "hi") {
  // Resolve by slug first so /news/{slug}/ maps to the translation that owns it.
  // Fall back to the requested language only if the slug is shared somehow.
  const bySlug = await query(
    `SELECT
      a.id, a.public_id, a.status, a.featured, a.breaking, a.demo_rank,
      a.published_at, a.scheduled_at, a.created_at, a.updated_at,
      t.id AS translation_id, t.language_code, t.slug, t.title, t.summary,
      t.author_display_name, t.image_alt, t.image_caption, t.image_position,
      t.seo_title, t.seo_description,
      m.file_url,
      u.name AS author_name,
      (
        SELECT c.slug
        FROM article_categories ac
        INNER JOIN categories c ON c.id = ac.category_id
        WHERE ac.article_id = a.id
        ORDER BY c.display_order ASC, c.id ASC
        LIMIT 1
      ) AS primary_category_slug,
      (
        SELECT GROUP_CONCAT(c.slug ORDER BY c.display_order ASC, c.id ASC SEPARATOR ',')
        FROM article_categories ac
        INNER JOIN categories c ON c.id = ac.category_id
        WHERE ac.article_id = a.id
      ) AS category_slugs,
      (
        SELECT GROUP_CONCAT(tg.name ORDER BY tg.name ASC SEPARATOR ',')
        FROM article_tags atg
        INNER JOIN tags tg ON tg.id = atg.tag_id
        WHERE atg.article_id = a.id
      ) AS tag_names
     FROM articles a
     INNER JOIN article_translations t ON t.article_id = a.id
     LEFT JOIN media m ON m.id = a.featured_image_id
     LEFT JOIN users u ON u.id = a.author_id
     WHERE ${PUBLISHED_WHERE} AND t.slug = :slug
     ORDER BY CASE WHEN t.language_code = :language THEN 0 ELSE 1 END
     LIMIT 1`,
    { language, slug },
  );
  if (!bySlug.length) {
    throw new AppError("Article not found", 404, { code: "NOT_FOUND" });
  }
  const [article] = await hydrateArticles(bySlug, { includeContent: true });
  return article;
}

async function getTrending(language = "hi", limit = 8) {
  const rows = await query(
    `${listSelect}
     WHERE ${PUBLISHED_WHERE} AND a.demo_rank IS NOT NULL
     ORDER BY a.demo_rank ASC, a.published_at DESC
     LIMIT ${Number(limit)}`,
    { language },
  );
  return hydrateArticles(rows);
}

async function ensureTags(connection, tagNames = []) {
  const ids = [];
  for (const name of tagNames) {
    const trimmed = String(name).trim();
    if (!trimmed) continue;
    const [existing] = await connection.execute(
      "SELECT id FROM tags WHERE name = ? LIMIT 1",
      [trimmed],
    );
    if (existing.length) {
      ids.push(existing[0].id);
      continue;
    }
    const [inserted] = await connection.execute(
      "INSERT INTO tags (name) VALUES (?)",
      [trimmed],
    );
    ids.push(inserted.insertId);
  }
  return [...new Set(ids.map(Number))];
}

async function replaceArticleCategories(connection, articleId, categoryIds) {
  await connection.execute("DELETE FROM article_categories WHERE article_id = ?", [
    articleId,
  ]);
  for (const categoryId of categoryIds) {
    await connection.execute(
      "INSERT INTO article_categories (article_id, category_id) VALUES (?, ?)",
      [articleId, categoryId],
    );
  }
}

async function replaceArticleTags(connection, articleId, tagIds) {
  await connection.execute("DELETE FROM article_tags WHERE article_id = ?", [
    articleId,
  ]);
  for (const tagId of tagIds) {
    await connection.execute(
      "INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)",
      [articleId, tagId],
    );
  }
}

async function replaceTranslationBlocks(connection, translationId, blocks) {
  await connection.execute(
    "DELETE FROM article_content_blocks WHERE translation_id = ?",
    [translationId],
  );
  let position = 1;
  for (const block of blocks || []) {
    await connection.execute(
      `INSERT INTO article_content_blocks (translation_id, position, block_type, content)
       VALUES (?, ?, ?, ?)`,
      [translationId, position, block.type, block.text],
    );
    position += 1;
  }
}

async function resolveCategoryIds(connection, categoryIds = [], categorySlugs = []) {
  const ids = new Set(categoryIds.map(Number).filter(Boolean));
  if (categorySlugs.length) {
    const placeholders = categorySlugs.map(() => "?").join(",");
    const [rows] = await connection.execute(
      `SELECT id, slug FROM categories WHERE slug IN (${placeholders})`,
      categorySlugs,
    );
    if (rows.length !== categorySlugs.length) {
      throw new AppError("One or more categories were not found", 400, {
        code: "INVALID_CATEGORY",
      });
    }
    rows.forEach((row) => ids.add(Number(row.id)));
  }
  if (!ids.size) {
    throw new AppError("At least one category is required", 400, {
      code: "VALIDATION_ERROR",
    });
  }
  return [...ids];
}

async function upsertTranslations(connection, articleId, translations) {
  const translationIds = [];
  for (const translation of translations) {
    const [existing] = await connection.execute(
      `SELECT id FROM article_translations
       WHERE article_id = ? AND language_code = ? LIMIT 1`,
      [articleId, translation.languageCode],
    );

    let translationId;
    if (existing.length) {
      translationId = existing[0].id;
      await connection.execute(
        `UPDATE article_translations SET
           slug = ?, title = ?, summary = ?, author_display_name = ?,
           image_alt = ?, image_caption = ?, image_position = ?,
           seo_title = ?, seo_description = ?
         WHERE id = ?`,
        [
          translation.slug,
          translation.title,
          translation.summary,
          translation.authorDisplayName || null,
          translation.imageAlt || "",
          translation.imageCaption || null,
          translation.imagePosition || "center",
          String(translation.seoTitle || "").trim() || null,
          String(translation.seoDescription || "").trim() || null,
          translationId,
        ],
      );
    } else {
      const [inserted] = await connection.execute(
        `INSERT INTO article_translations (
           article_id, language_code, slug, title, summary, author_display_name,
           image_alt, image_caption, image_position, seo_title, seo_description
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          articleId,
          translation.languageCode,
          translation.slug,
          translation.title,
          translation.summary,
          translation.authorDisplayName || null,
          translation.imageAlt || "",
          translation.imageCaption || null,
          translation.imagePosition || "center",
          String(translation.seoTitle || "").trim() || null,
          String(translation.seoDescription || "").trim() || null,
        ],
      );
      translationId = inserted.insertId;
    }

    await replaceTranslationBlocks(connection, translationId, translation.content);
    translationIds.push(Number(translationId));
  }
  return translationIds;
}

async function createArticle(payload, actor) {
  return withTransaction(async (connection) => {
    assertPublicationWriteAllowed(payload, actor);

    const categoryIds = await resolveCategoryIds(
      connection,
      payload.categoryIds,
      payload.categorySlugs,
    );
    const tagIds = await ensureTags(connection, payload.tags || []);

    const isPublisher = canManagePublication(actor);
    const status = isPublisher ? payload.status || "draft" : "draft";
    const publishedAt = !isPublisher
      ? null
      : status === "published"
        ? toMysqlDatetime(payload.publishedAt || new Date())
        : payload.publishedAt
          ? toMysqlDatetime(payload.publishedAt)
          : null;
    const scheduledAt = !isPublisher
      ? null
      : status === "scheduled"
        ? toMysqlDatetime(payload.scheduledAt)
        : payload.scheduledAt
          ? toMysqlDatetime(payload.scheduledAt)
          : null;

    if (status === "scheduled" && !scheduledAt) {
      throw new AppError("scheduledAt is required when status is scheduled", 400, {
        code: "VALIDATION_ERROR",
      });
    }

    const authorId = isPublisher
      ? payload.authorId || actor.id
      : actor.id;

    const [result] = await connection.execute(
      `INSERT INTO articles (
         public_id, author_id, status, featured_image_id, featured, breaking,
         demo_rank, published_at, scheduled_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.publicId,
        authorId,
        status,
        payload.featuredImageId || null,
        isPublisher && payload.featured ? 1 : 0,
        isPublisher && payload.breaking ? 1 : 0,
        isPublisher ? (payload.demoRank ?? null) : null,
        publishedAt,
        scheduledAt,
      ],
    );

    const articleId = result.insertId;
    await replaceArticleCategories(connection, articleId, categoryIds);
    await replaceArticleTags(connection, articleId, tagIds);
    await upsertTranslations(connection, articleId, payload.translations);
    return articleId;
  });
}

async function updateArticle(id, payload, actor) {
  return withTransaction(async (connection) => {
    const [existing] = await connection.execute(
      "SELECT id, author_id, status FROM articles WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existing.length) {
      throw new AppError("Article not found", 404, { code: "NOT_FOUND" });
    }

    assertAdminArticleAccess(existing[0], actor);
    assertAuthorMayMutateArticle(existing[0], actor);
    assertPublicationWriteAllowed(payload, actor);

    const isPublisher = canManagePublication(actor);
    const fields = [];
    const values = [];

    if (payload.publicId !== undefined) {
      fields.push("public_id = ?");
      values.push(payload.publicId);
    }
    if (isPublisher && payload.authorId !== undefined) {
      fields.push("author_id = ?");
      values.push(payload.authorId);
    }
    if (isPublisher && payload.status !== undefined) {
      fields.push("status = ?");
      values.push(payload.status);
    }
    if (payload.featuredImageId !== undefined) {
      fields.push("featured_image_id = ?");
      values.push(payload.featuredImageId);
    }
    if (isPublisher && payload.featured !== undefined) {
      fields.push("featured = ?");
      values.push(payload.featured ? 1 : 0);
    }
    if (isPublisher && payload.breaking !== undefined) {
      fields.push("breaking = ?");
      values.push(payload.breaking ? 1 : 0);
    }
    if (isPublisher && payload.demoRank !== undefined) {
      fields.push("demo_rank = ?");
      values.push(payload.demoRank);
    }
    if (isPublisher && payload.publishedAt !== undefined) {
      fields.push("published_at = ?");
      values.push(
        payload.publishedAt ? toMysqlDatetime(payload.publishedAt) : null,
      );
    }
    if (isPublisher && payload.scheduledAt !== undefined) {
      fields.push("scheduled_at = ?");
      values.push(
        payload.scheduledAt ? toMysqlDatetime(payload.scheduledAt) : null,
      );
    }

    if (fields.length) {
      values.push(id);
      await connection.execute(
        `UPDATE articles SET ${fields.join(", ")} WHERE id = ?`,
        values,
      );
    }

    if (payload.categoryIds || payload.categorySlugs) {
      const categoryIds = await resolveCategoryIds(
        connection,
        payload.categoryIds || [],
        payload.categorySlugs || [],
      );
      await replaceArticleCategories(connection, id, categoryIds);
    }

    if (payload.tags) {
      const tagIds = await ensureTags(connection, payload.tags);
      await replaceArticleTags(connection, id, tagIds);
    }

    if (payload.translations?.length) {
      await upsertTranslations(connection, id, payload.translations);
    }

    return id;
  });
}

async function getAdminArticleById(id, actor) {
  const articles = await query(
    `SELECT a.*, m.file_url, u.name AS author_name, u.email AS author_email
     FROM articles a
     LEFT JOIN media m ON m.id = a.featured_image_id
     LEFT JOIN users u ON u.id = a.author_id
     WHERE a.id = ?
     LIMIT 1`,
    [id],
  );
  if (!articles.length) {
    throw new AppError("Article not found", 404, { code: "NOT_FOUND" });
  }

  const article = articles[0];
  if (actor) {
    assertAdminArticleAccess(article, actor);
  }
  const translations = await query(
    `SELECT * FROM article_translations WHERE article_id = ? ORDER BY language_code`,
    [id],
  );
  const blocksMap = await loadBlocks(translations.map((item) => Number(item.id)));
  const tags = (await loadTags([Number(id)])).get(Number(id)) || [];
  const categories = await query(
    `SELECT c.id, c.slug
     FROM article_categories ac
     INNER JOIN categories c ON c.id = ac.category_id
     WHERE ac.article_id = ?
     ORDER BY c.display_order ASC, c.id ASC`,
    [id],
  );

  return {
    id: Number(article.id),
    publicId: article.public_id,
    status: article.status,
    featured: Boolean(article.featured),
    breaking: Boolean(article.breaking),
    demoRank: article.demo_rank == null ? null : Number(article.demo_rank),
    featuredImageId: article.featured_image_id
      ? Number(article.featured_image_id)
      : null,
    featuredImageUrl: article.file_url || null,
    authorId: article.author_id ? Number(article.author_id) : null,
    authorName: article.author_name || null,
    publishedAt: toIsoString(article.published_at),
    scheduledAt: toIsoString(article.scheduled_at),
    createdAt: toIsoString(article.created_at),
    updatedAt: toIsoString(article.updated_at),
    categories: categories.map((item) => ({
      id: Number(item.id),
      slug: item.slug,
    })),
    tags,
    translations: translations.map((item) => ({
      id: Number(item.id),
      languageCode: item.language_code,
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      authorDisplayName: item.author_display_name,
      imageAlt: item.image_alt,
      imageCaption: item.image_caption,
      imagePosition: item.image_position,
      seoTitle: item.seo_title ? String(item.seo_title) : "",
      seoDescription: item.seo_description ? String(item.seo_description) : "",
      content: (blocksMap.get(Number(item.id)) || []).map((block) => ({
        type: block.block_type,
        text: block.content,
      })),
    })),
  };
}

async function listAdminArticles({
  page = 1,
  limit = 20,
  status,
  language = "hi",
  search,
  actor,
} = {}) {
  const pagination = parsePagination({ page, limit });
  const where = ["1=1"];
  const params = { language };

  if (actor?.role === "author") {
    where.push("a.author_id = :ownerId");
    params.ownerId = Number(actor.id);
  }

  if (status) {
    where.push("a.status = :status");
    params.status = status;
  }

  if (search) {
    where.push(`(
      t.title LIKE :search
      OR t.summary LIKE :search
      OR t.slug LIKE :search
      OR a.public_id LIKE :search
    )`);
    params.search = `%${search}%`;
  }

  const whereSql = where.join(" AND ");
  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM articles a
     INNER JOIN article_translations t
       ON t.article_id = a.id AND t.language_code = :language
     WHERE ${whereSql}`,
    params,
  );
  const rows = await query(
    `${listSelect}
     WHERE ${whereSql}
     ORDER BY a.updated_at DESC, a.id DESC
     LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
    params,
  );

  return {
    articles: await hydrateArticles(rows),
    meta: paginationMeta(Number(countRows[0].total), pagination.page, pagination.limit),
  };
}

async function setStatus(id, status, extra = {}, actor = null) {
  return withTransaction(async (connection) => {
    const [existing] = await connection.execute(
      "SELECT id, status, author_id FROM articles WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existing.length) {
      throw new AppError("Article not found", 404, { code: "NOT_FOUND" });
    }

    // Defense in depth: publication transitions are admin/editor only.
    if (actor) {
      assertCanManagePublication(actor);
    }

    if (status === "published") {
      await connection.execute(
        `UPDATE articles
         SET status = 'published',
             published_at = COALESCE(?, published_at, UTC_TIMESTAMP()),
             scheduled_at = NULL
         WHERE id = ?`,
        [extra.publishedAt ? toMysqlDatetime(extra.publishedAt) : null, id],
      );
    } else if (status === "scheduled") {
      if (!extra.scheduledAt) {
        throw new AppError("scheduledAt is required", 400, {
          code: "VALIDATION_ERROR",
        });
      }
      await connection.execute(
        `UPDATE articles
         SET status = 'scheduled',
             scheduled_at = ?,
             published_at = NULL
         WHERE id = ?`,
        [toMysqlDatetime(extra.scheduledAt), id],
      );
    } else if (status === "archived") {
      await connection.execute(
        `UPDATE articles SET status = 'archived' WHERE id = ?`,
        [id],
      );
    } else if (status === "draft") {
      await connection.execute(
        `UPDATE articles
         SET status = 'draft', scheduled_at = NULL
         WHERE id = ?`,
        [id],
      );
    } else {
      throw new AppError("Unsupported status", 400, { code: "VALIDATION_ERROR" });
    }

    return id;
  });
}

async function deleteArticle(id, actor) {
  return withTransaction(async (connection) => {
    const [existing] = await connection.execute(
      "SELECT id, author_id, status FROM articles WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existing.length) {
      throw new AppError("Article not found", 404, { code: "NOT_FOUND" });
    }
    if (!canManagePublication(actor)) {
      // Authors are not granted delete on any status via routes today; keep
      // service-layer denial so alternate callers cannot remove public pages.
      throw new AppError("Insufficient permissions", 403, { code: "FORBIDDEN" });
    }
    await connection.execute("DELETE FROM articles WHERE id = ?", [id]);
    return true;
  });
}

async function publishDueScheduledArticles() {
  return withTransaction(async (connection) => {
    const [due] = await connection.execute(
      `SELECT id FROM articles
       WHERE status = 'scheduled'
         AND scheduled_at IS NOT NULL
         AND scheduled_at <= UTC_TIMESTAMP()
       FOR UPDATE`,
    );

    if (!due.length) return [];

    const ids = due.map((row) => Number(row.id));
    const placeholders = ids.map(() => "?").join(",");
    await connection.execute(
      `UPDATE articles
       SET status = 'published',
           published_at = COALESCE(scheduled_at, UTC_TIMESTAMP()),
           scheduled_at = NULL
       WHERE id IN (${placeholders})
         AND status = 'scheduled'`,
      ids,
    );
    return ids;
  });
}

module.exports = {
  listPublishedArticles,
  getPublishedBySlug,
  getTrending,
  createArticle,
  updateArticle,
  getAdminArticleById,
  listAdminArticles,
  setStatus,
  deleteArticle,
  publishDueScheduledArticles,
  mapFrontendArticle,
  canManagePublication,
  AUTHOR_EDITABLE_STATUSES,
};
