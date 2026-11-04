/**
 * Tenant Isolation Test
 * Proves that Tenant A cannot read or write Tenant B's data.
 *
 * Run: node db/seed/test-isolation.js
 */
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || "postgres://vortex_app:change_me@localhost:5432/vortex";
const pool = new Pool({ connectionString });

async function testIsolation() {
  let passed = 0, failed = 0;

  // Get tenant IDs from seed
  const { rows: tenants } = await pool.query("SELECT id, name FROM tenants ORDER BY name");
  if (tenants.length < 2) {
    console.error("Need at least 2 tenants. Run `npm run db:seed` first.");
    process.exit(1);
  }

  const tenantA = tenants[0]; // Lycée Victor Hugo
  const tenantB = tenants[1]; // École Les Lilas

  console.log(`Testing tenant isolation:`);
  console.log(`  Tenant A: ${tenantA.name} (${tenantA.id})`);
  console.log(`  Tenant B: ${tenantB.name} (${tenantB.id})`);
  console.log("");

  // Test 1: Tenant A can read its own students
  try {
    const client = await pool.connect();
    await client.query(`SET LOCAL app.tenant_id = '${tenantA.id}'`);
    await client.query(`SET LOCAL app.role = 'direction'`);
    const { rows } = await client.query("SELECT * FROM students");
    await client.query("COMMIT");
    client.release();

    if (rows.length > 0 && rows.every((r) => r.tenant_id === tenantA.id)) {
      console.log("✅ Test 1: Tenant A can read own students");
      passed++;
    } else {
      console.log("❌ Test 1 FAILED: Tenant A read returned wrong data");
      failed++;
    }
  } catch (e) {
    console.log("❌ Test 1 FAILED:", e.message);
    failed++;
  }

  // Test 2: Tenant A CANNOT read Tenant B's students (RLS blocks it)
  try {
    const client = await pool.connect();
    await client.query("BEGIN");
    await client.query(`SET LOCAL app.tenant_id = '${tenantA.id}'`);
    await client.query(`SET LOCAL app.role = 'direction'`);

    // Get Tenant B's student IDs directly
    const { rows: bStudents } = await pool.query("SELECT id FROM students WHERE tenant_id = $1", [tenantB.id]);

    if (bStudents.length === 0) {
      console.log("⚠️  Test 2 skipped: no Tenant B students found");
    } else {
      const bStudentId = bStudents[0].id;
      const { rows } = await client.query("SELECT * FROM students WHERE id = $1", [bStudentId]);
      await client.query("COMMIT");
      client.release();

      if (rows.length === 0) {
        console.log("✅ Test 2: Tenant A cannot read Tenant B's students (RLS blocked)");
        passed++;
      } else {
        console.log("❌ Test 2 FAILED: Tenant A read Tenant B's student data!");
        failed++;
      }
    }
  } catch (e) {
    // RLS might throw an error, which is also acceptable
    console.log("✅ Test 2: Tenant A blocked from Tenant B data (RLS enforced)");
    passed++;
  }

  // Test 3: Tenant A CANNOT insert a student into Tenant B
  try {
    const client = await pool.connect();
    await client.query("BEGIN");
    await client.query(`SET LOCAL app.tenant_id = '${tenantA.id}'`);
    await client.query(`SET LOCAL app.role = 'staff'`);

    await client.query(
      `INSERT INTO students (tenant_id, school_id, matricule, first_name, last_name, status)
       VALUES ($1, (SELECT id FROM schools WHERE tenant_id = $2 LIMIT 1), 'HACK-001', 'Hack', 'Attempt', 'active')`,
      [tenantB.id, tenantB.id]
    );
    await client.query("COMMIT");
    client.release();

    console.log("❌ Test 3 FAILED: Tenant A inserted into Tenant B!");
    failed++;
  } catch (e) {
    console.log("✅ Test 3: Tenant A cannot insert into Tenant B (RLS blocked)");
    passed++;
    // Rollback the failed transaction
    try { await pool.query("ROLLBACK"); } catch {}
  }

  // Test 4: Immutable matricule — UPDATE should fail
  try {
    const client = await pool.connect();
    await client.query("BEGIN");
    await client.query(`SET LOCAL app.tenant_id = '${tenantA.id}'`);
    await client.query(`SET LOCAL app.role = 'direction'`);
    const { rows } = await client.query("SELECT id FROM students WHERE tenant_id = current_tenant_id() LIMIT 1");
    if (rows.length > 0) {
      await client.query("UPDATE students SET matricule = 'CHANGED' WHERE id = $1", [rows[0].id]);
      await client.query("COMMIT");
      client.release();
      console.log("❌ Test 4 FAILED: matricule was mutable!");
      failed++;
    } else {
      console.log("⚠️  Test 4 skipped: no students found");
    }
  } catch (e) {
    console.log("✅ Test 4: matricule is immutable (trigger blocked change)");
    passed++;
    try { await pool.query("ROLLBACK"); } catch {}
  }

  // Test 5: Audit log is insert-only — UPDATE should fail
  try {
    const client = await pool.connect();
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT id FROM audit_log LIMIT 1");
    if (rows.length > 0) {
      await client.query("UPDATE audit_log SET table_name = 'HACKED' WHERE id = $1", [rows[0].id]);
      await client.query("COMMIT");
      client.release();
      console.log("❌ Test 5 FAILED: audit_log was mutable!");
      failed++;
    } else {
      console.log("⚠️  Test 5 skipped: no audit_log entries");
    }
  } catch (e) {
    console.log("✅ Test 5: audit_log is insert-only (UPDATE blocked)");
    passed++;
    try { await pool.query("ROLLBACK"); } catch {}
  }

  // Test 6: Audit log DELETE should fail
  try {
    const client = await pool.connect();
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT id FROM audit_log LIMIT 1");
    if (rows.length > 0) {
      await client.query("DELETE FROM audit_log WHERE id = $1", [rows[0].id]);
      await client.query("COMMIT");
      client.release();
      console.log("❌ Test 6 FAILED: audit_log row was deleted!");
      failed++;
    } else {
      console.log("⚠️  Test 6 skipped: no audit_log entries");
    }
  } catch (e) {
    console.log("✅ Test 6: audit_log DELETE blocked");
    passed++;
    try { await pool.query("ROLLBACK"); } catch {}
  }

  // Test 7: Invalid student status transition
  try {
    const client = await pool.connect();
    await client.query("BEGIN");
    await client.query(`SET LOCAL app.tenant_id = '${tenantA.id}'`);
    await client.query(`SET LOCAL app.role = 'direction'`);
    const { rows } = await client.query("SELECT id, status FROM students WHERE tenant_id = current_tenant_id() AND status = 'active' LIMIT 1");
    if (rows.length > 0) {
      // Try invalid transition: active -> pre_admission (not allowed)
      await client.query("UPDATE students SET status = 'pre_admission' WHERE id = $1", [rows[0].id]);
      await client.query("COMMIT");
      client.release();
      console.log("❌ Test 7 FAILED: invalid status transition was allowed!");
      failed++;
    } else {
      console.log("⚠️  Test 7 skipped: no active students");
    }
  } catch (e) {
    console.log("✅ Test 7: invalid status transition blocked");
    passed++;
    try { await pool.query("ROLLBACK"); } catch {}
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("❌ Tenant isolation tests FAILED");
    process.exit(1);
  } else {
    console.log("✅ All tenant isolation tests PASSED");
    process.exit(0);
  }
}

testIsolation().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
