import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

export function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}