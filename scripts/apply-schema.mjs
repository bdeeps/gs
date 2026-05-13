import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function applySchema() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to prepare PostgreSQL.");
  }

  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    max: 1
  });

  try {
    await pool.query(schema);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("extension") && message.includes("vector")) {
      throw new Error(
        "PostgreSQL is missing pgvector. Use a Railway Postgres service/image with pgvector support, then retry startup."
      );
    }

    throw error;
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  applySchema().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
