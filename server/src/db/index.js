import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "";

export const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: process.env.PG_SSL === "disable" ? false : { rejectUnauthorized: false },
    })
  : null;

export async function query(text, params = []) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }
  return pool.query(text, params);
}

export async function initDb() {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS devices (
      id UUID PRIMARY KEY,
      device_key TEXT NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (device_key, user_id)
    );
  `);
}
