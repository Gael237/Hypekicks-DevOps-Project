import pg from "pg";

const { Pool } = pg;

function readFirstDefined(env, keys) {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return null;
}

function parsePort(portValue, fallback) {
  if (!portValue) return fallback;
  const parsed = Number.parseInt(portValue, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function isMemoryMode(env = process.env) {
  return String(env.DB_MODE || "").trim().toLowerCase() === "memory";
}

export function resolvePoolOptions(env = process.env) {
  const connectionString = readFirstDefined(env, ["DATABASE_URL"]);
  if (connectionString) {
    return { connectionString };
  }

  return {
    host: readFirstDefined(env, ["DB_HOST", "PGHOST", "POSTGRES_HOST"]) || "localhost",
    port: parsePort(readFirstDefined(env, ["DB_PORT", "PGPORT", "POSTGRES_PORT"]), 5432),
    user: readFirstDefined(env, ["DB_USER", "PGUSER", "POSTGRES_USER"]) || "finlab",
    password: readFirstDefined(env, ["DB_PASSWORD", "PGPASSWORD", "POSTGRES_PASSWORD"]) || "finlab",
    database: readFirstDefined(env, ["DB_NAME", "PGDATABASE", "POSTGRES_DB"]) || "finlab",
  };
}

export function createPool(env = process.env) {
  if (isMemoryMode(env)) {
    return null;
  }
  return new Pool(resolvePoolOptions(env));
}

export async function ensureSchema(pool) {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  //A partir de aqui son cambios
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'buyer',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}
