import "../env.js";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { pool } from "./pool.js";

export async function runMigrations() {
  const migrationsDir = join(process.cwd(), "db", "migrations");

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id serial PRIMARY KEY,
      filename text UNIQUE NOT NULL,
      applied_at timestamptz DEFAULT now()
    );
  `);

  const { rows } = await pool.query("SELECT filename FROM _migrations");
  const applied = new Set(rows.map((r) => r.filename));

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    console.log(`Running migration: ${file}`);
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    await pool.query(sql);
    await pool.query("INSERT INTO _migrations (filename) VALUES ($1)", [file]);
    console.log(`  ✓ Applied ${file}`);
  }

  console.log("Migrations complete.");
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
