import { ok, created, noContent, notFound, route, type Route } from "../http.ts";
import { isTeacher, assertTeacherOwnsClassSubject, assertTeacherCanSeeStudent } from "../teacherScope.ts";

const MANAGERS = ["super_admin", "direction", "staff"];
const TEACHING = ["super_admin", "direction", "staff", "teacher"];
const ADMINS = ["super_admin", "direction"];

export const studentRoutes: Route[] = [
  route("GET", "/api/students", async ({ db, user, query }) => {
    const classId = query.get("class_id");
    const status = query.get("status");
    const search = query.get("search");
    let q = "SELECT * FROM students WHERE 1=1";
    const params: any[] = [];
    if (classId) { params.push(classId); q += ` AND class_id = $${params.length}`; }
    if (status) { params.push(status); q += ` AND status = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      q += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR matricule ILIKE $${params.length})`;
    }
    if (isTeacher(user)) {
      params.push(user.userId);
      q += ` AND class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = $${params.length})`;
    }
    q += " ORDER BY last_name, first_name";
    return ok(await db.unsafe(q, params));
  }),

  route("GET", "/api/students/:id", async ({ db, user, params }) => {
    await assertTeacherCanSeeStudent(db, user, params.id);
    const rows = await db.unsafe("SELECT * FROM students WHERE id=$1", [params.id]);
    return rows.length === 0 ? notFound("Student not found") : ok(rows[0]);
  }),

  route("POST", "/api/students", async ({ db, user, body }) => {
    const rows = await db.unsafe(
      `INSERT INTO students (tenant_id, school_id, class_id, user_id, matricule, first_name, last_name,
        date_of_birth, gender, phone, address, status, enrollment_date, previous_education)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [user.tenantId, body.school_id, body.class_id || null, body.user_id || null, body.matricule,
       body.first_name, body.last_name, body.date_of_birth || null, body.gender || null,
       body.phone || null, body.address || null, body.status || "pre_admission",
       body.enrollment_date || new Date().toISOString().slice(0, 10), body.previous_education || null],
    );
    return created(rows[0]);
  }, MANAGERS),

  route("PUT", "/api/students/:id", async ({ db, body, params }) => {
    const rows = await db.unsafe(
      `UPDATE students SET
        school_id=$1, class_id=$2, first_name=$3, last_name=$4,
        date_of_birth=$5, gender=$6, phone=$7, address=$8,
        status=$9, previous_education=$10, updated_at=now()
       WHERE id=$11 RETURNING *`,
      [body.school_id, body.class_id || null, body.first_name, body.last_name,
       body.date_of_birth || null, body.gender || null, body.phone || null,
       body.address || null, body.status, body.previous_education || null, params.id],
    );
    return rows.length === 0 ? notFound("Student not found") : ok(rows[0]);
  }, MANAGERS),

  route("DELETE", "/api/students/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM students WHERE id=$1", [params.id]);
    return noContent();
  }, ADMINS),

  route("GET", "/api/students/:id/status-history", async ({ db, user, params }) => {
    await assertTeacherCanSeeStudent(db, user, params.id);
    return ok(await db.unsafe("SELECT * FROM student_status_history WHERE student_id=$1 ORDER BY changed_at DESC", [params.id]));
  }),

  route("GET", "/api/students/:id/guardians", async ({ db, user, params }) => {
    await assertTeacherCanSeeStudent(db, user, params.id);
    return ok(await db.unsafe("SELECT * FROM guardians WHERE student_id=$1", [params.id]));
  }),

  route("POST", "/api/students/:id/guardians", async ({ db, user, body, params }) => {
    const { full_name, phone, email, relation } = body;
    const rows = await db.unsafe(
      "INSERT INTO guardians (tenant_id, student_id, full_name, phone, email, relation) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [user.tenantId, params.id, full_name, phone || null, email || null, relation || null],
    );
    return created(rows[0]);
  }, MANAGERS),

  route("DELETE", "/api/guardians/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM guardians WHERE id=$1", [params.id]);
    return noContent();
  }, MANAGERS),

  route("GET", "/api/enrollments", async ({ db, user, query }) => {
    const studentId = query.get("student_id");
    const classSubjectId = query.get("class_subject_id");
    let q = `SELECT e.*, cs.class_id, cs.subject_id, s.name as subject_name
             FROM enrollments e
             JOIN class_subjects cs ON cs.id = e.class_subject_id
             JOIN subjects s ON s.id = cs.subject_id
             WHERE 1=1`;
    const params: any[] = [];
    if (studentId) { params.push(studentId); q += ` AND e.student_id = $${params.length}`; }
    if (classSubjectId) { params.push(classSubjectId); q += ` AND e.class_subject_id = $${params.length}`; }
    if (isTeacher(user)) { params.push(user.userId); q += ` AND cs.teacher_id = $${params.length}`; }
    return ok(await db.unsafe(q, params));
  }),

  route("POST", "/api/enrollments", async ({ db, user, body }) => {
    const { student_id, class_subject_id, academic_year_id } = body;
    await assertTeacherOwnsClassSubject(db, user, class_subject_id);
    await assertTeacherCanSeeStudent(db, user, student_id);
    const rows = await db.unsafe(
      "INSERT INTO enrollments (tenant_id, student_id, class_subject_id, academic_year_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [user.tenantId, student_id, class_subject_id, academic_year_id],
    );
    return created(rows[0]);
  }, TEACHING),

  route("DELETE", "/api/enrollments/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM enrollments WHERE id=$1", [params.id]);
    return noContent();
  }, MANAGERS),

  route("POST", "/api/students/import/preview", async ({ db, body }) => {
    const csvRows = body.rows as any[];
    const results: Array<{ row: any; errors: string[]; valid: boolean }> = [];
    for (const r of csvRows) {
      const errors: string[] = [];
      if (!r.matricule) errors.push("matricule manquant");
      if (!r.first_name) errors.push("prénom manquant");
      if (!r.last_name) errors.push("nom manquant");
      if (r.matricule) {
        const existing = await db.unsafe("SELECT id FROM students WHERE matricule=$1", [r.matricule]);
        if (existing.length > 0) errors.push("matricule déjà existant");
      }
      results.push({ row: r, errors, valid: errors.length === 0 });
    }
    return ok({ results, validCount: results.filter((r) => r.valid).length, totalCount: results.length });
  }, MANAGERS),

  route("POST", "/api/students/import/confirm", async ({ db, user, body }) => {
    const csvRows = body.rows as any[];
    const schoolId = body.school_id;
    const classId = body.class_id || null;
    let imported = 0;
    const errors: Array<{ row: number; error: string }> = [];
    for (let i = 0; i < csvRows.length; i++) {
      const r = csvRows[i];
      try {
        await db.savepoint((sp) => sp.unsafe(
          `INSERT INTO students (tenant_id, school_id, class_id, matricule, first_name, last_name, date_of_birth, gender, phone, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')`,
          [user.tenantId, schoolId, classId, r.matricule, r.first_name, r.last_name,
           r.date_of_birth || null, r.gender || null, r.phone || null],
        ));
        imported++;
      } catch (err) {
        errors.push({ row: i + 1, error: (err as Error).message });
      }
    }
    return ok({ imported, errors, total: csvRows.length });
  }, MANAGERS),
];
