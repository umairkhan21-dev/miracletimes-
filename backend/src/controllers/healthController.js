const { verifyConnection } = require("../config/database");
const { asyncHandler } = require("../utils/asyncHandler");

const getHealth = asyncHandler(async (_req, res) => {
  const db = await verifyConnection();

  res.json({
    success: true,
    data: {
      status: "ok",
      service: "miracle-times-api",
      timestamp: new Date().toISOString(),
      database: {
        connected: db.ok,
        name: db.database,
      },
    },
  });
});

module.exports = { getHealth };
