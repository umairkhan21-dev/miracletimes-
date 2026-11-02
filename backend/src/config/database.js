const mysql = require("mysql2/promise");
const { env } = require("./env");

/** @type {import('mysql2/promise').Pool | null} */
let pool = null;

function createPool() {
  return mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
    dateStrings: true,
    timezone: "Z",
  });
}

function getPool() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

async function query(sql, params) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function withConnection(fn) {
  const connection = await getPool().getConnection();
  try {
    return await fn(connection);
  } finally {
    connection.release();
  }
}

async function withTransaction(fn) {
  return withConnection(async (connection) => {
    await connection.beginTransaction();
    try {
      const result = await fn(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}

async function verifyConnection() {
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
    const [rows] = await connection.query("SELECT DATABASE() AS db");
    return {
      ok: true,
      database: rows[0]?.db || env.DB_NAME,
    };
  } finally {
    connection.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  query,
  withConnection,
  withTransaction,
  verifyConnection,
  closePool,
};
