function ok(res, data, statusCode = 200, meta) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
}

function created(res, data) {
  return ok(res, data, 201);
}

module.exports = { ok, created };
