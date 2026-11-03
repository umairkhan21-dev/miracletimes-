const { query, withTransaction } = require("../config/database");
const { AppError } = require("../utils/AppError");
const { toIsoString } = require("../utils/datetime");

function mapCategoryRow(row, language = "hi") {
  return {
    id: Number(row.id),
    slug: row.slug,
    name: row.name,
    english: row.english_name || row.name,
    description: row.description,
    href: `/category/${row.slug}`,
    isActive: Boolean(row.is_active),
    displayOrder: Number(row.display_order),
    language,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

async function listPublicCategories(language = "hi") {
  const rows = await query(
    `SELECT c.id, c.slug, c.is_active, c.display_order, c.created_at, c.updated_at,
            ct.name, ct.description,
            en.name AS english_name
     FROM categories c
     INNER JOIN category_translations ct
       ON ct.category_id = c.id AND ct.language_code = ?
     LEFT JOIN category_translations en
       ON en.category_id = c.id AND en.language_code = 'en'
     WHERE c.is_active = 1
     ORDER BY c.display_order ASC, c.id ASC`,
    [language],
  );
  return rows.map((row) => mapCategoryRow(row, language));
}

async function listAdminCategories() {
  const categories = await query(
    `SELECT id, slug, is_active, display_order, created_at, updated_at
     FROM categories
     ORDER BY display_order ASC, id ASC`,
  );
  const translations = await query(
    `SELECT id, category_id, language_code, name, description
     FROM category_translations`,
  );

  return categories.map((category) => ({
    id: Number(category.id),
    slug: category.slug,
    isActive: Boolean(category.is_active),
    displayOrder: Number(category.display_order),
    createdAt: toIsoString(category.created_at),
    updatedAt: toIsoString(category.updated_at),
    translations: translations
      .filter((item) => Number(item.category_id) === Number(category.id))
      .map((item) => ({
        id: Number(item.id),
        languageCode: item.language_code,
        name: item.name,
        description: item.description,
      })),
  }));
}

async function getCategoryBySlug(slug, language = "hi") {
  const rows = await query(
    `SELECT c.id, c.slug, c.is_active, c.display_order, c.created_at, c.updated_at,
            ct.name, ct.description,
            en.name AS english_name
     FROM categories c
     INNER JOIN category_translations ct
       ON ct.category_id = c.id AND ct.language_code = ?
     LEFT JOIN category_translations en
       ON en.category_id = c.id AND en.language_code = 'en'
     WHERE c.slug = ? AND c.is_active = 1
     LIMIT 1`,
    [language, slug],
  );
  if (!rows.length) {
    throw new AppError("Category not found", 404, { code: "NOT_FOUND" });
  }
  return mapCategoryRow(rows[0], language);
}

async function createCategory(payload) {
  return withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO categories (slug, is_active, display_order)
       VALUES (?, ?, ?)`,
      [
        payload.slug,
        payload.isActive === false ? 0 : 1,
        payload.displayOrder ?? 0,
      ],
    );
    const categoryId = result.insertId;

    for (const translation of payload.translations) {
      await connection.execute(
        `INSERT INTO category_translations (category_id, language_code, name, description)
         VALUES (?, ?, ?, ?)`,
        [
          categoryId,
          translation.languageCode,
          translation.name,
          translation.description,
        ],
      );
    }

    return categoryId;
  });
}

async function updateCategory(id, payload) {
  return withTransaction(async (connection) => {
    const [existing] = await connection.execute(
      "SELECT id FROM categories WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existing.length) {
      throw new AppError("Category not found", 404, { code: "NOT_FOUND" });
    }

    const fields = [];
    const values = [];
    if (payload.slug !== undefined) {
      fields.push("slug = ?");
      values.push(payload.slug);
    }
    if (payload.isActive !== undefined) {
      fields.push("is_active = ?");
      values.push(payload.isActive ? 1 : 0);
    }
    if (payload.displayOrder !== undefined) {
      fields.push("display_order = ?");
      values.push(payload.displayOrder);
    }
    if (fields.length) {
      values.push(id);
      await connection.execute(
        `UPDATE categories SET ${fields.join(", ")} WHERE id = ?`,
        values,
      );
    }

    if (payload.translations?.length) {
      for (const translation of payload.translations) {
        await connection.execute(
          `INSERT INTO category_translations (category_id, language_code, name, description)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             description = VALUES(description),
             updated_at = CURRENT_TIMESTAMP`,
          [
            id,
            translation.languageCode,
            translation.name,
            translation.description,
          ],
        );
      }
    }

    return id;
  });
}

module.exports = {
  listPublicCategories,
  listAdminCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  mapCategoryRow,
};
