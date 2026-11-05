import { ok, created, noContent, notFound, forbidden, route, type Route } from "../http.ts";
import {
  isTeacher,
  assertTeacherOwnsClassSubject,
  assertTeacherOwnsGradeItem,
  assertTeacherOwnsSession,
  assertTeacherCanSeeStudent,
} from "../teacherScope.ts";

const MANAGERS = ["super_admin", "direction", "staff"];
const TEACHING = ["super_admin", "direction", "staff", "teacher"];
const ADMINS = ["super_admin", "direction"];
const LOCK_OVERRIDE = ["direction", "super_admin"];

export const teachingRoutes: Route[] = [
  // Class subjects
  route("GET", "/api/class-subjects", async ({ db, user, query }) => {
    const classId = query.get("class_id");
    let q = `SELECT cs.*, s.name as subject_name, s.code as subject_code, s.coefficient,
             c.name as class_name, u.full_name as teacher_name
             FROM class_subjects cs
             JOIN subjects s ON s.id = cs.subject_id
             JOIN classes c ON c.id = cs.class_id
             LEFT JOIN users u ON u.id = cs.teacher_id
             WHERE 1=1`;
    const params: any[] = [];
    if (classId) { params.push(classId); q += ` AND cs.class_id = $${params.length}`; }
    if (isTeacher(user)) { params.push(user.userId); q += ` AND cs.teacher_id = $${params.length}`; }
    q += " ORDER BY s.name";
    return ok(await db.unsafe(q, params));
  }),
  route("POST", "/api/class-subjects", async ({ db, user, body }) => {
    const { class_id, subject_id, teacher_id } = body;
    const rows = await db.unsafe(
      "INSERT INTO class_subjects (tenant_id, class_id, subject_id, teacher_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [user.tenantId, class_id, subject_id, teacher_id || null],
    );
    return created(rows[0]);
  }, MANAGERS),
  route("DELETE", "/api/class-subjects/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM class_subjects WHERE id=$1", [params.id]);
    return noContent();
  }, MANAGERS),

  // Grade items
  route("GET", "/api/grade-items", async ({ db, user, query }) => {
    const classSubjectId = query.get("class_subject_id");
    const academicYearId = query.get("academic_year_id");
    let q = "SELECT gi.* FROM grade_items gi JOIN class_subjects cs ON cs.id = gi.class_subject_id WHERE 1=1";
    const params: any[] = [];
    if (classSubjectId) { params.push(classSubjectId); q += ` AND gi.class_subject_id = $${params.length}`; }
    if (academicYearId) { params.push(academicYearId); q += ` AND gi.academic_year_id = $${params.length}`; }
    if (isTeacher(user)) { params.push(user.userId); q += ` AND cs.teacher_id = $${params.length}`; }
    q += " ORDER BY gi.created_at";
    return ok(await db.unsafe(q, params));
  }),
  route("POST", "/api/grade-items", async ({ db, user, body }) => {
    const { class_subject_id, academic_year_id, title, grade_type, max_score, weight } = body;
    await assertTeacherOwnsClassSubject(db, user, class_subject_id);
    const rows = await db.unsafe(
      "INSERT INTO grade_items (tenant_id, class_subject_id, academic_year_id, title, grade_type, max_score, weight) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [user.tenantId, class_subject_id, academic_year_id, title, grade_type || "exam", max_score || 20, weight || 1.0],
    );
    return created(rows[0]);
  }, TEACHING),
  route("PUT", "/api/grade-items/:id", async ({ db, user, body, params }) => {
    const { title, grade_type, max_score, weight } = body;
    await assertTeacherOwnsGradeItem(db, user, params.id);
    const existing = await db.unsafe("SELECT period_closed FROM grade_items WHERE id=$1", [params.id]);
    if (existing.length === 0) return notFound();
    if (existing[0].period_closed && !LOCK_OVERRIDE.includes(user.role)) {
      return forbidden("Ces notes ont été envoyées à l'administration. Seule la direction peut les rouvrir.");
    }
    const rows = await db.unsafe(
      "UPDATE grade_items SET title=$1, grade_type=$2, max_score=$3, weight=$4 WHERE id=$5 RETURNING *",
      [title, grade_type, max_score, weight, params.id],
    );
    return ok(rows[0]);
  }, TEACHING),
  route("DELETE", "/api/grade-items/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM grade_items WHERE id=$1", [params.id]);
    return noContent();
  }, MANAGERS),
  route("POST", "/api/grade-items/:id/close", async ({ db, user, params }) => {
    await assertTeacherOwnsGradeItem(db, user, params.id);
    const rows = await db.unsafe("UPDATE grade_items SET period_closed=true WHERE id=$1 RETURNING *", [params.id]);
    return ok(rows[0]);
  }, TEACHING),
  route("POST", "/api/grade-items/:id/reopen", async ({ db, params }) => {
    const rows = await db.unsafe("UPDATE grade_items SET period_closed=false WHERE id=$1 RETURNING *", [params.id]);
    return ok(rows[0]);
  }, ADMINS),

  // Grades
  route("GET", "/api/grades", async ({ db, user, query }) => {
    const gradeItemId = query.get("grade_item_id");
    const studentId = query.get("student_id");
    let q = `SELECT g.* FROM grades g
             JOIN grade_items gi ON gi.id = g.grade_item_id
             JOIN class_subjects cs ON cs.id = gi.class_subject_id
             WHERE 1=1`;
    const params: any[] = [];
    if (gradeItemId) { params.push(gradeItemId); q += ` AND g.grade_item_id = $${params.length}`; }
    if (studentId) { params.push(studentId); q += ` AND g.student_id = $${params.length}`; }
    if (isTeacher(user)) { params.push(user.userId); q += ` AND cs.teacher_id = $${params.length}`; }
    return ok(await db.unsafe(q, params));
  }),
  route("POST", "/api/grades", async ({ db, user, body }) => {
    const { grade_item_id, student_id, score, is_absent, comment } = body;
    await assertTeacherOwnsGradeItem(db, user, grade_item_id);
    await assertTeacherCanSeeStudent(db, user, student_id);
    const gi = await db.unsafe("SELECT period_closed FROM grade_items WHERE id=$1", [grade_item_id]);
    if (gi.length > 0 && gi[0].period_closed && !LOCK_OVERRIDE.includes(user.role)) {
      return forbidden("Ces notes ont été envoyées à l'administration. Seule la direction peut les modifier.");
    }
    const rows = await db.unsafe(
      `INSERT INTO grades (tenant_id, grade_item_id, student_id, score, is_absent, comment, graded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (grade_item_id, student_id) DO UPDATE SET score=$4, is_absent=$5, comment=$6, graded_by=$7, graded_at=now()
       RETURNING *`,
      [user.tenantId, grade_item_id, student_id, score, is_absent || false, comment || null, user.userId],
    );
    return created(rows[0]);
  }, TEACHING),
  route("DELETE", "/api/grades/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM grades WHERE id=$1", [params.id]);
    return noContent();
  }, MANAGERS),

  // Attendance sessions
  route("GET", "/api/attendance-sessions", async ({ db, user, query }) => {
    const classSubjectId = query.get("class_subject_id");
    let q = `SELECT s.* FROM attendance_sessions s
             JOIN class_subjects cs ON cs.id = s.class_subject_id
             WHERE 1=1`;
    const params: any[] = [];
    if (classSubjectId) { params.push(classSubjectId); q += ` AND s.class_subject_id = $${params.length}`; }
    if (isTeacher(user)) { params.push(user.userId); q += ` AND cs.teacher_id = $${params.length}`; }
    q += " ORDER BY s.session_date DESC";
    return ok(await db.unsafe(q, params));
  }),
  route("POST", "/api/attendance-sessions", async ({ db, user, body }) => {
    const { class_subject_id, session_date } = body;
    await assertTeacherOwnsClassSubject(db, user, class_subject_id);
    const rows = await db.unsafe(
      "INSERT INTO attendance_sessions (tenant_id, class_subject_id, session_date, created_by) VALUES ($1, $2, $3, $4) RETURNING *",
      [user.tenantId, class_subject_id, session_date, user.userId],
    );
    return created(rows[0]);
  }, TEACHING),
  route("DELETE", "/api/attendance-sessions/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM attendance_sessions WHERE id=$1", [params.id]);
    return noContent();
  }, MANAGERS),

  // Attendance records
  route("GET", "/api/attendance-records", async ({ db, user, query }) => {
    const sessionId = query.get("session_id");
    const studentId = query.get("student_id");
    let q = `SELECT ar.* FROM attendance_records ar
             JOIN attendance_sessions s ON s.id = ar.session_id
             JOIN class_subjects cs ON cs.id = s.class_subject_id
             WHERE 1=1`;
    const params: any[] = [];
    if (sessionId) { params.push(sessionId); q += ` AND ar.session_id = $${params.length}`; }
    if (studentId) { params.push(studentId); q += ` AND ar.student_id = $${params.length}`; }
    if (isTeacher(user)) { params.push(user.userId); q += ` AND cs.teacher_id = $${params.length}`; }
    return ok(await db.unsafe(q, params));
  }),
  route("POST", "/api/attendance-records", async ({ db, user, body }) => {
    const { session_id, student_id, status, notes } = body;
    await assertTeacherOwnsSession(db, user, session_id);
    await assertTeacherCanSeeStudent(db, user, student_id);
    const rows = await db.unsafe(
      `INSERT INTO attendance_records (tenant_id, session_id, student_id, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (session_id, student_id) DO UPDATE SET status=$4, notes=$5
       RETURNING *`,
      [user.tenantId, session_id, student_id, status || "present", notes || null],
    );
    return created(rows[0]);
  }, TEACHING),
  route("POST", "/api/attendance-records/batch", async ({ db, user, body }) => {
    const records = body.records as Array<{ session_id: string; student_id: string; status: string }>;
    const results: unknown[] = [];
    for (const r of records) {
      await assertTeacherOwnsSession(db, user, r.session_id);
      await assertTeacherCanSeeStudent(db, user, r.student_id);
      const rows = await db.unsafe(
        `INSERT INTO attendance_records (tenant_id, session_id, student_id, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (session_id, student_id) DO UPDATE SET status=$4
         RETURNING *`,
        [user.tenantId, r.session_id, r.student_id, r.status],
      );
      results.push(rows[0]);
    }
    return created(results);
  }, TEACHING),
];
