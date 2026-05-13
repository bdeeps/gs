import { Pool } from "pg";

let pool: Pool | undefined;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    max: Number(process.env.PG_POOL_MAX || 5),
    query_timeout: 20_000,
    statement_timeout: 20_000
  });

  return pool;
}

export function toVectorLiteral(values: number[]) {
  if (!values.length || values.some((value) => !Number.isFinite(value))) {
    throw new Error("Embedding must be a non-empty finite number array.");
  }

  return `[${values.join(",")}]`;
}
