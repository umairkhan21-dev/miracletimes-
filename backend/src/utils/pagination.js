function parsePagination(query, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  const page = Math.max(1, Number(query.page) || defaults.page);
  const limit = Math.min(
    defaults.maxLimit,
    Math.max(1, Number(query.limit) || defaults.limit),
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function paginationMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

module.exports = { parsePagination, paginationMeta };
