import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgres://vortex_app:change_me@localhost:5432/vortex";

export const pool = new Pool({
  connectionString,
});

export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

/**
 * Run a function inside a transaction with tenant context set.
 * SET LOCAL app.tenant_id and app.role are scoped to the transaction.
 */
export async function withTenant<T>(
  tenantId: string | null,
  role: string,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId ?? ""]);
    await client.query("SELECT set_config('app.role', $1, true)", [role]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
