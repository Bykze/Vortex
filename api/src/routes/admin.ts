import type { FastifyRequest, FastifyReply } from "fastify";
import { tenantHandler } from "../middleware/tenant.js";
import type pg from "pg";

export async function registerAdminRoutes(app: import("fastify").FastifyInstance) {
  // ==================== SCHOOLS ====================
  app.get("/api/schools", { preHandler: [app.auth] }, tenantHandler(async (_req, reply, client: pg.PoolClient) => {
    const { rows } = await client.query("SELECT * FROM schools ORDER BY name");
    return reply.send(rows);
  }));

  app.post("/api/schools", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { name, code, address, city, phone, email } = req.body as any;
    const { rows } = await client.query(
      "INSERT INTO schools (tenant_id, name, code, address, city, phone, email) VALUES (current_tenant_id(), $1, $2, $3, $4, $5, $6) RETURNING *",
      [name, code, address, city, phone, email]
    );
    return reply.code(201).send(rows[0]);
  }));

  app.put("/api/schools/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    const { name, code, address, city, phone, email } = req.body as any;
    const { rows } = await client.query(
      "UPDATE schools SET name=$1, code=$2, address=$3, city=$4, phone=$5, email=$6, updated_at=now() WHERE id=$7 RETURNING *",
      [name, code, address, city, phone, email, id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Not found" });
    return reply.send(rows[0]);
  }));

  app.delete("/api/schools/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    await client.query("DELETE FROM schools WHERE id=$1", [id]);
    return reply.code(204).send();
  }));

  // ==================== ACADEMIC YEARS ====================
  app.get("/api/academic-years", { preHandler: [app.auth] }, tenantHandler(async (_req, reply, client) => {
    const { rows } = await client.query("SELECT * FROM academic_years ORDER BY start_date DESC");
    return reply.send(rows);
  }));

  app.post("/api/academic-years", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { school_id, name, start_date, end_date, is_current } = req.body as any;
    const { rows } = await client.query(
      "INSERT INTO academic_years (tenant_id, school_id, name, start_date, end_date, is_current) VALUES (current_tenant_id(), $1, $2, $3, $4, $5) RETURNING *",
      [school_id, name, start_date, end_date, is_current || false]
    );
    return reply.code(201).send(rows[0]);
  }));

  app.put("/api/academic-years/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    const { school_id, name, start_date, end_date, is_current } = req.body as any;
    const { rows } = await client.query(
      "UPDATE academic_years SET school_id=$1, name=$2, start_date=$3, end_date=$4, is_current=$5 WHERE id=$6 RETURNING *",
      [school_id, name, start_date, end_date, is_current, id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Not found" });
    return reply.send(rows[0]);
  }));

  app.delete("/api/academic-years/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    await client.query("DELETE FROM academic_years WHERE id=$1", [id]);
    return reply.code(204).send();
  }));

  // ==================== CLASSES ====================
  app.get("/api/classes", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
    const { school_id, academic_year_id } = req.query as any;
    let q = "SELECT * FROM classes WHERE 1=1";
    const params: unknown[] = [];
    if (school_id) { params.push(school_id); q += ` AND school_id = $${params.length}`; }
    if (academic_year_id) { params.push(academic_year_id); q += ` AND academic_year_id = $${params.length}`; }
    q += " ORDER BY name";
    const { rows } = await client.query(q, params);
    return reply.send(rows);
  }));

  app.post("/api/classes", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { school_id, academic_year_id, name, level, capacity } = req.body as any;
    const { rows } = await client.query(
      "INSERT INTO classes (tenant_id, school_id, academic_year_id, name, level, capacity) VALUES (current_tenant_id(), $1, $2, $3, $4, $5) RETURNING *",
      [school_id, academic_year_id, name, level, capacity || 40]
    );
    return reply.code(201).send(rows[0]);
  }));

  app.put("/api/classes/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    const { school_id, academic_year_id, name, level, capacity } = req.body as any;
    const { rows } = await client.query(
      "UPDATE classes SET school_id=$1, academic_year_id=$2, name=$3, level=$4, capacity=$5 WHERE id=$6 RETURNING *",
      [school_id, academic_year_id, name, level, capacity, id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Not found" });
    return reply.send(rows[0]);
  }));

  app.delete("/api/classes/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    await client.query("DELETE FROM classes WHERE id=$1", [id]);
    return reply.code(204).send();
  }));

  // ==================== SUBJECTS ====================
  app.get("/api/subjects", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
    const { school_id } = req.query as any;
    let q = "SELECT * FROM subjects WHERE 1=1";
    const params: unknown[] = [];
    if (school_id) { params.push(school_id); q += ` AND school_id = $${params.length}`; }
    q += " ORDER BY name";
    const { rows } = await client.query(q, params);
    return reply.send(rows);
  }));

  app.post("/api/subjects", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { school_id, name, code, coefficient } = req.body as any;
    const { rows } = await client.query(
      "INSERT INTO subjects (tenant_id, school_id, name, code, coefficient) VALUES (current_tenant_id(), $1, $2, $3, $4) RETURNING *",
      [school_id, name, code, coefficient || 1.0]
    );
    return reply.code(201).send(rows[0]);
  }));

  app.put("/api/subjects/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    const { school_id, name, code, coefficient } = req.body as any;
    const { rows } = await client.query(
      "UPDATE subjects SET school_id=$1, name=$2, code=$3, coefficient=$4 WHERE id=$5 RETURNING *",
      [school_id, name, code, coefficient, id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Not found" });
    return reply.send(rows[0]);
  }));

  app.delete("/api/subjects/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    await client.query("DELETE FROM subjects WHERE id=$1", [id]);
    return reply.code(204).send();
  }));

  // ==================== PROGRESSION RULES ====================
  app.get("/api/progression-rules", { preHandler: [app.auth] }, tenantHandler(async (_req, reply, client) => {
    const { rows } = await client.query("SELECT * FROM progression_rules ORDER BY rule_name");
    return reply.send(rows);
  }));

  app.post("/api/progression-rules", { preHandler: [app.auth, app.requireRole("super_admin","direction")] }, tenantHandler(async (req, reply, client) => {
    const { school_id, rule_key, rule_name, rule_value, is_active } = req.body as any;
    const { rows } = await client.query(
      "INSERT INTO progression_rules (tenant_id, school_id, rule_key, rule_name, rule_value, is_active) VALUES (current_tenant_id(), $1, $2, $3, $4, $5) RETURNING *",
      [school_id || null, rule_key, rule_name, JSON.stringify(rule_value || {}), is_active !== false]
    );
    return reply.code(201).send(rows[0]);
  }));

  app.put("/api/progression-rules/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    const { school_id, rule_key, rule_name, rule_value, is_active } = req.body as any;
    const { rows } = await client.query(
      "UPDATE progression_rules SET school_id=$1, rule_key=$2, rule_name=$3, rule_value=$4, is_active=$5 WHERE id=$6 RETURNING *",
      [school_id || null, rule_key, rule_name, JSON.stringify(rule_value || {}), is_active !== false, id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Not found" });
    return reply.send(rows[0]);
  }));

  app.delete("/api/progression-rules/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    await client.query("DELETE FROM progression_rules WHERE id=$1", [id]);
    return reply.code(204).send();
  }));

  // ==================== TENANT SETTINGS (super_admin only) ====================
  app.get("/api/tenant-settings", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const user = (req as any).user;
    const { rows } = await client.query("SELECT * FROM tenant_settings WHERE tenant_id = $1", [user.tenantId]);
    return reply.send(rows[0] || {});
  }));

  app.put("/api/tenant-settings", { preHandler: [app.auth, app.requireRole("super_admin")] }, tenantHandler(async (req, reply, client) => {
    const user = (req as any).user;
    const { school_name, school_logo_url, ai_enabled, max_students, max_teachers, locale } = req.body as any;
    const { rows } = await client.query(
      `UPDATE tenant_settings SET
        school_name = COALESCE($1, school_name),
        school_logo_url = COALESCE($2, school_logo_url),
        ai_enabled = COALESCE($3, ai_enabled),
        max_students = COALESCE($4, max_students),
        max_teachers = COALESCE($5, max_teachers),
        locale = COALESCE($6, locale),
        updated_at = now()
       WHERE tenant_id = $7 RETURNING *`,
      [school_name, school_logo_url, ai_enabled, max_students, max_teachers, locale, user.tenantId]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Settings not found" });
    return reply.send(rows[0]);
  }));

  // ==================== TENANTS (super_admin only) ====================
  app.get("/api/tenants", { preHandler: [app.auth, app.requireRole("super_admin")] }, tenantHandler(async (_req, reply, client) => {
    const { rows } = await client.query("SELECT * FROM tenants ORDER BY created_at DESC");
    return reply.send(rows);
  }));

  app.put("/api/tenants/:id/subscription", { preHandler: [app.auth, app.requireRole("super_admin")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    const { plan, status, expires_at } = req.body as any;
    const { rows } = await client.query(
      "UPDATE tenants SET plan=$1, status=$2, expires_at=$3, updated_at=now() WHERE id=$4 RETURNING *",
      [plan, status, expires_at, id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Tenant not found" });
    return reply.send(rows[0]);
  }));

  app.post("/api/tenants/:id/payments", { preHandler: [app.auth, app.requireRole("super_admin")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    const { amount, currency, payment_method } = req.body as any;
    const user = (req as any).user;
    const { rows } = await client.query(
      "INSERT INTO payments (tenant_id, amount, currency, payment_method, recorded_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [id, amount, currency || "EUR", payment_method, user.userId]
    );
    return reply.code(201).send(rows[0]);
  }));
}
