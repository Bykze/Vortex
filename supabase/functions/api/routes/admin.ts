import { ok, created, noContent, notFound, route, type Route } from "../http.ts";

const MANAGERS = ["super_admin", "direction", "staff"];
const ADMINS = ["super_admin", "direction"];
const SUPER = ["super_admin"];

export const adminRoutes: Route[] = [
  // Schools
  route("GET", "/api/schools", async ({ db }) => ok(await db.unsafe("SELECT * FROM schools ORDER BY name"))),
  route("POST", "/api/schools", async ({ db, user, body }) => {
    const { name, code, address, city, phone, email } = body;
    const rows = await db.unsafe(
      "INSERT INTO schools (tenant_id, name, code, address, city, phone, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [user.tenantId, name, code, address, city, phone, email],
    );
    return created(rows[0]);
  }, MANAGERS),
  route("PUT", "/api/schools/:id", async ({ db, body, params }) => {
    const { name, code, address, city, phone, email } = body;
    const rows = await db.unsafe(
      "UPDATE schools SET name=$1, code=$2, address=$3, city=$4, phone=$5, email=$6, updated_at=now() WHERE id=$7 RETURNING *",
      [name, code, address, city, phone, email, params.id],
    );
    return rows.length === 0 ? notFound() : ok(rows[0]);
  }, MANAGERS),
  route("DELETE", "/api/schools/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM schools WHERE id=$1", [params.id]);
    return noContent();
  }, ADMINS),

  // Academic years
  route("GET", "/api/academic-years", async ({ db }) =>
    ok(await db.unsafe("SELECT * FROM academic_years ORDER BY start_date DESC"))),
  route("POST", "/api/academic-years", async ({ db, user, body }) => {
    const { school_id, name, start_date, end_date, is_current } = body;
    const rows = await db.unsafe(
      "INSERT INTO academic_years (tenant_id, school_id, name, start_date, end_date, is_current) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [user.tenantId, school_id, name, start_date, end_date, is_current || false],
    );
    return created(rows[0]);
  }, MANAGERS),
  route("PUT", "/api/academic-years/:id", async ({ db, body, params }) => {
    const { school_id, name, start_date, end_date, is_current } = body;
    const rows = await db.unsafe(
      "UPDATE academic_years SET school_id=$1, name=$2, start_date=$3, end_date=$4, is_current=$5 WHERE id=$6 RETURNING *",
      [school_id, name, start_date, end_date, is_current, params.id],
    );
    return rows.length === 0 ? notFound() : ok(rows[0]);
  }, MANAGERS),
  route("DELETE", "/api/academic-years/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM academic_years WHERE id=$1", [params.id]);
    return noContent();
  }, ADMINS),

  // Classes
  route("GET", "/api/classes", async ({ db, query }) => {
    const schoolId = query.get("school_id");
    const academicYearId = query.get("academic_year_id");
    let q = "SELECT * FROM classes WHERE 1=1";
    const params: any[] = [];
    if (schoolId) { params.push(schoolId); q += ` AND school_id = $${params.length}`; }
    if (academicYearId) { params.push(academicYearId); q += ` AND academic_year_id = $${params.length}`; }
    q += " ORDER BY name";
    return ok(await db.unsafe(q, params));
  }),
  route("POST", "/api/classes", async ({ db, user, body }) => {
    const { school_id, academic_year_id, name, level, capacity } = body;
    const rows = await db.unsafe(
      "INSERT INTO classes (tenant_id, school_id, academic_year_id, name, level, capacity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [user.tenantId, school_id, academic_year_id, name, level, capacity || 40],
    );
    return created(rows[0]);
  }, MANAGERS),
  route("PUT", "/api/classes/:id", async ({ db, body, params }) => {
    const { school_id, academic_year_id, name, level, capacity } = body;
    const rows = await db.unsafe(
      "UPDATE classes SET school_id=$1, academic_year_id=$2, name=$3, level=$4, capacity=$5 WHERE id=$6 RETURNING *",
      [school_id, academic_year_id, name, level, capacity, params.id],
    );
    return rows.length === 0 ? notFound() : ok(rows[0]);
  }, MANAGERS),
  route("DELETE", "/api/classes/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM classes WHERE id=$1", [params.id]);
    return noContent();
  }, ADMINS),

  // Subjects
  route("GET", "/api/subjects", async ({ db, query }) => {
    const schoolId = query.get("school_id");
    let q = "SELECT * FROM subjects WHERE 1=1";
    const params: any[] = [];
    if (schoolId) { params.push(schoolId); q += ` AND school_id = $${params.length}`; }
    q += " ORDER BY name";
    return ok(await db.unsafe(q, params));
  }),
  route("POST", "/api/subjects", async ({ db, user, body }) => {
    const { school_id, name, code, coefficient } = body;
    const rows = await db.unsafe(
      "INSERT INTO subjects (tenant_id, school_id, name, code, coefficient) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [user.tenantId, school_id, name, code, coefficient || 1.0],
    );
    return created(rows[0]);
  }, MANAGERS),
  route("PUT", "/api/subjects/:id", async ({ db, body, params }) => {
    const { school_id, name, code, coefficient } = body;
    const rows = await db.unsafe(
      "UPDATE subjects SET school_id=$1, name=$2, code=$3, coefficient=$4 WHERE id=$5 RETURNING *",
      [school_id, name, code, coefficient, params.id],
    );
    return rows.length === 0 ? notFound() : ok(rows[0]);
  }, MANAGERS),
  route("DELETE", "/api/subjects/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM subjects WHERE id=$1", [params.id]);
    return noContent();
  }, ADMINS),

  // Progression rules
  route("GET", "/api/progression-rules", async ({ db }) =>
    ok(await db.unsafe("SELECT * FROM progression_rules ORDER BY rule_name"))),
  route("POST", "/api/progression-rules", async ({ db, user, body }) => {
    const { school_id, rule_key, rule_name, rule_value, is_active } = body;
    const rows = await db.unsafe(
      "INSERT INTO progression_rules (tenant_id, school_id, rule_key, rule_name, rule_value, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [user.tenantId, school_id || null, rule_key, rule_name, JSON.stringify(rule_value || {}), is_active !== false],
    );
    return created(rows[0]);
  }, ADMINS),
  route("PUT", "/api/progression-rules/:id", async ({ db, body, params }) => {
    const { school_id, rule_key, rule_name, rule_value, is_active } = body;
    const rows = await db.unsafe(
      "UPDATE progression_rules SET school_id=$1, rule_key=$2, rule_name=$3, rule_value=$4, is_active=$5 WHERE id=$6 RETURNING *",
      [school_id || null, rule_key, rule_name, JSON.stringify(rule_value || {}), is_active !== false, params.id],
    );
    return rows.length === 0 ? notFound() : ok(rows[0]);
  }, ADMINS),
  route("DELETE", "/api/progression-rules/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM progression_rules WHERE id=$1", [params.id]);
    return noContent();
  }, ADMINS),

  // Tenant settings
  route("GET", "/api/tenant-settings", async ({ db, user }) => {
    const rows = await db.unsafe("SELECT * FROM tenant_settings WHERE tenant_id = $1", [user.tenantId]);
    return ok(rows[0] || {});
  }, MANAGERS),
  route("PUT", "/api/tenant-settings", async ({ db, user, body }) => {
    const { school_name, school_logo_url, ai_enabled, max_students, max_teachers, locale } = body;
    const rows = await db.unsafe(
      `UPDATE tenant_settings SET
        school_name = COALESCE($1, school_name),
        school_logo_url = COALESCE($2, school_logo_url),
        ai_enabled = COALESCE($3, ai_enabled),
        max_students = COALESCE($4, max_students),
        max_teachers = COALESCE($5, max_teachers),
        locale = COALESCE($6, locale),
        updated_at = now()
       WHERE tenant_id = $7 RETURNING *`,
      [school_name, school_logo_url, ai_enabled, max_students, max_teachers, locale, user.tenantId],
    );
    return rows.length === 0 ? notFound("Settings not found") : ok(rows[0]);
  }, SUPER),

  // Tenants (super admin)
  route("GET", "/api/tenants", async ({ db }) =>
    ok(await db.unsafe("SELECT * FROM tenants ORDER BY created_at DESC")), SUPER),
  route("PUT", "/api/tenants/:id/subscription", async ({ db, body, params }) => {
    const { plan, status, expires_at } = body;
    const rows = await db.unsafe(
      "UPDATE tenants SET plan=$1, status=$2, expires_at=$3, updated_at=now() WHERE id=$4 RETURNING *",
      [plan, status, expires_at, params.id],
    );
    return rows.length === 0 ? notFound("Tenant not found") : ok(rows[0]);
  }, SUPER),
  route("POST", "/api/tenants/:id/payments", async ({ db, user, body, params }) => {
    const { amount, currency, payment_method } = body;
    const rows = await db.unsafe(
      "INSERT INTO payments (tenant_id, amount, currency, payment_method, recorded_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [params.id, amount, currency || "EUR", payment_method, user.userId],
    );
    return created(rows[0]);
  }, SUPER),
];
