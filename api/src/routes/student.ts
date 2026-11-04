import type { FastifyRequest, FastifyReply } from "fastify";
import { tenantHandler } from "../middleware/tenant.js";
import type pg from "pg";
import { isTeacher, assertTeacherOwnsClassSubject, assertTeacherCanSeeStudent } from "../lib/teacherScope.js";

export async function registerStudentRoutes(app: import("fastify").FastifyInstance) {
  // ==================== STUDENTS (Registry) ====================
  app.get("/api/students", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client: pg.PoolClient) => {
    const user = (req as any).user;
    const { class_id, status, search } = req.query as any;
    let q = "SELECT * FROM students WHERE 1=1";
    const params: unknown[] = [];
    if (class_id) { params.push(class_id); q += ` AND class_id = ${params.length}`; }
    if (status) { params.push(status); q += ` AND status = ${params.length}`; }
    if (search) { params.push(`%${search}%`); q += ` AND (first_name ILIKE ${params.length} OR last_name ILIKE ${params.length} OR matricule ILIKE ${params.length})`; }
    if (isTeacher(user)) { params.push(user.userId); q += ` AND class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = ${params.length})`; }
    q += " ORDER BY last_name, first_name";
    const { rows } = await client.query(q, params);
    return reply.send(rows);
  }));

  app.get("/api/students/:id", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
    const user = (req as any).user;
    const { id } = req.params as { id: string };
    await assertTeacherCanSeeStudent(client, user, id);
    const { rows } = await client.query("SELECT * FROM students WHERE id=$1", [id]);
    if (rows.length === 0) return reply.code(404).send({ error: "Student not found" });
    return reply.send(rows[0]);
  }));

  app.post("/api/students", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const body = req.body as any;
    const { rows } = await client.query(
      `INSERT INTO students (tenant_id, school_id, class_id, user_id, matricule, first_name, last_name,
        date_of_birth, gender, phone, address, status, enrollment_date, previous_education)
       VALUES (current_tenant_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [body.school_id, body.class_id || null, body.user_id || null, body.matricule,
       body.first_name, body.last_name, body.date_of_birth || null, body.gender || null,
       body.phone || null, body.address || null, body.status || "pre_admission",
       body.enrollment_date || new Date().toISOString().slice(0,10), body.previous_education || null]
    );
    return reply.code(201).send(rows[0]);
  }));

  app.put("/api/students/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    // Note: tenant_id and matricule are immutable (triggers enforce this)
    const { rows } = await client.query(
      `UPDATE students SET
        school_id=$1, class_id=$2, first_name=$3, last_name=$4,
        date_of_birth=$5, gender=$6, phone=$7, address=$8,
        status=$9, previous_education=$10, updated_at=now()
       WHERE id=$11 RETURNING *`,
      [body.school_id, body.class_id || null, body.first_name, body.last_name,
       body.date_of_birth || null, body.gender || null, body.phone || null,
       body.address || null, body.status, body.previous_education || null, id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Student not found" });
    return reply.send(rows[0]);
  }));

  app.delete("/api/students/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    await client.query("DELETE FROM students WHERE id=$1", [id]);
    return reply.code(204).send();
  }));

  // Student status history
  app.get("/api/students/:id/status-history", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
    const user = (req as any).user;
    const { id } = req.params as { id: string };
    await assertTeacherCanSeeStudent(client, user, id);
    const { rows } = await client.query("SELECT * FROM student_status_history WHERE student_id=$1 ORDER BY changed_at DESC", [id]);
    return reply.send(rows);
  }));

  // ==================== GUARDIANS ====================
  app.get("/api/students/:id/guardians", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
    const user = (req as any).user;
    const { id } = req.params as { id: string };
    await assertTeacherCanSeeStudent(client, user, id);
    const { rows } = await client.query("SELECT * FROM guardians WHERE student_id=$1", [id]);
    return reply.send(rows);
  }));

  app.post("/api/students/:id/guardians", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    const { full_name, phone, email, relation } = req.body as any;
    const { rows } = await client.query(
      "INSERT INTO guardians (tenant_id, student_id, full_name, phone, email, relation) VALUES (current_tenant_id(), $1, $2, $3, $4, $5) RETURNING *",
      [id, full_name, phone || null, email || null, relation || null]
    );
    return reply.code(201).send(rows[0]);
  }));

  app.delete("/api/guardians/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    await client.query("DELETE FROM guardians WHERE id=$1", [id]);
    return reply.code(204).send();
  }));

  // ==================== ENROLLMENTS ====================
  app.get("/api/enrollments", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
    const user = (req as any).user;
    const { student_id, class_subject_id } = req.query as any;
    let q = `SELECT e.*, cs.class_id, cs.subject_id, s.name as subject_name
             FROM enrollments e
             JOIN class_subjects cs ON cs.id = e.class_subject_id
             JOIN subjects s ON s.id = cs.subject_id
             WHERE 1=1`;
    const params: unknown[] = [];
    if (student_id) { params.push(student_id); q += ` AND e.student_id = ${params.length}`; }
    if (class_subject_id) { params.push(class_subject_id); q += ` AND e.class_subject_id = ${params.length}`; }
    if (isTeacher(user)) { params.push(user.userId); q += ` AND cs.teacher_id = ${params.length}`; }
    const { rows } = await client.query(q, params);
    return reply.send(rows);
  }));

  app.post("/api/enrollments", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff","teacher")] }, tenantHandler(async (req, reply, client) => {
    const user = (req as any).user;
    const { student_id, class_subject_id, academic_year_id } = req.body as any;
    await assertTeacherOwnsClassSubject(client, user, class_subject_id);
    await assertTeacherCanSeeStudent(client, user, student_id);
    const { rows } = await client.query(
      "INSERT INTO enrollments (tenant_id, student_id, class_subject_id, academic_year_id) VALUES (current_tenant_id(), $1, $2, $3) RETURNING *",
      [student_id, class_subject_id, academic_year_id]
    );
    return reply.code(201).send(rows[0]);
  }));

  app.delete("/api/enrollments/:id", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { id } = req.params as { id: string };
    await client.query("DELETE FROM enrollments WHERE id=$1", [id]);
    return reply.code(204).send();
  }));

  // ==================== CSV IMPORT (with preview) ====================
  app.post("/api/students/import/preview", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { rows: csvRows, school_id, class_id } = req.body as { rows: any[]; school_id: string; class_id?: string };
    const results: Array<{ row: any; errors: string[]; valid: boolean }> = [];

    for (let i = 0; i < csvRows.length; i++) {
      const r = csvRows[i];
      const errors: string[] = [];
      if (!r.matricule) errors.push("matricule manquant");
      if (!r.first_name) errors.push("prénom manquant");
      if (!r.last_name) errors.push("nom manquant");

      // Check duplicate matricule
      if (r.matricule) {
        const { rows: existing } = await client.query("SELECT id FROM students WHERE matricule=$1", [r.matricule]);
        if (existing.length > 0) errors.push("matricule déjà existant");
      }

      results.push({ row: r, errors, valid: errors.length === 0 });
    }

    return reply.send({ results, validCount: results.filter(r => r.valid).length, totalCount: results.length });
  }));

  app.post("/api/students/import/confirm", { preHandler: [app.auth, app.requireRole("super_admin","direction","staff")] }, tenantHandler(async (req, reply, client) => {
    const { rows: csvRows, school_id, class_id } = req.body as { rows: any[]; school_id: string; class_id?: string };
    let imported = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < csvRows.length; i++) {
      const r = csvRows[i];
      try {
        await client.query(
          `INSERT INTO students (tenant_id, school_id, class_id, matricule, first_name, last_name, date_of_birth, gender, phone, status)
           VALUES (current_tenant_id(), $1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
          [school_id, class_id || null, r.matricule, r.first_name, r.last_name,
           r.date_of_birth || null, r.gender || null, r.phone || null]
        );
        imported++;
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message });
      }
    }

    return reply.send({ imported, errors, total: csvRows.length });
  }));
}
