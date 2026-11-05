import { ok, created, noContent, notFound, route, type Route } from "../http.ts";
import { isTeacher, assertTeacherCanSeeStudent } from "../teacherScope.ts";

const MANAGERS = ["super_admin", "direction", "staff"];
const ADMINS = ["super_admin", "direction"];

export const monitoringRoutes: Route[] = [
  route("GET", "/api/risk-scores", async ({ db, user, query }) => {
    const riskLevel = query.get("risk_level");
    const academicYearId = query.get("academic_year_id");
    let q = `SELECT rs.*, s.first_name, s.last_name, s.matricule
             FROM risk_scores rs
             JOIN students s ON s.id = rs.student_id
             WHERE 1=1`;
    const params: any[] = [];
    if (riskLevel) { params.push(riskLevel); q += ` AND rs.risk_level = $${params.length}`; }
    if (academicYearId) { params.push(academicYearId); q += ` AND rs.academic_year_id = $${params.length}`; }
    if (isTeacher(user)) {
      params.push(user.userId);
      q += ` AND s.class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = $${params.length})`;
    }
    q += " ORDER BY rs.risk_score DESC";
    return ok(await db.unsafe(q, params));
  }),

  route("POST", "/api/risk-scores", async ({ db, user, body }) => {
    const { student_id, academic_year_id, risk_level, risk_score, grade_trend, attendance_rate, late_count, absence_count, contributing_factors } = body;
    const rows = await db.unsafe(
      `INSERT INTO risk_scores (tenant_id, student_id, academic_year_id, risk_level, risk_score, grade_trend, attendance_rate, late_count, absence_count, contributing_factors)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [user.tenantId, student_id, academic_year_id, risk_level || "low", risk_score || 0,
       grade_trend || 0, attendance_rate || 100, late_count || 0, absence_count || 0,
       JSON.stringify(contributing_factors || [])],
    );
    return created(rows[0]);
  }, MANAGERS),

  route("PUT", "/api/risk-scores/:id", async ({ db, body, params }) => {
    const { risk_level, risk_score, grade_trend, attendance_rate, late_count, absence_count, contributing_factors } = body;
    const rows = await db.unsafe(
      `UPDATE risk_scores SET risk_level=$1, risk_score=$2, grade_trend=$3, attendance_rate=$4,
        late_count=$5, absence_count=$6, contributing_factors=$7, assessed_at=now()
       WHERE id=$8 RETURNING *`,
      [risk_level, risk_score, grade_trend, attendance_rate, late_count, absence_count,
       JSON.stringify(contributing_factors || []), params.id],
    );
    return rows.length === 0 ? notFound() : ok(rows[0]);
  }, MANAGERS),

  route("DELETE", "/api/risk-scores/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM risk_scores WHERE id=$1", [params.id]);
    return noContent();
  }, ADMINS),

  route("GET", "/api/interventions", async ({ db, user, query }) => {
    const studentId = query.get("student_id");
    const status = query.get("status");
    let q = `SELECT i.*, s.first_name, s.last_name, s.matricule
             FROM interventions i
             JOIN students s ON s.id = i.student_id
             WHERE 1=1`;
    const params: any[] = [];
    if (studentId) { params.push(studentId); q += ` AND i.student_id = $${params.length}`; }
    if (status) { params.push(status); q += ` AND i.status = $${params.length}`; }
    if (isTeacher(user)) {
      params.push(user.userId);
      q += ` AND s.class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = $${params.length})`;
    }
    q += " ORDER BY i.created_at DESC";
    return ok(await db.unsafe(q, params));
  }),

  route("POST", "/api/interventions", async ({ db, user, body }) => {
    const { student_id, academic_year_id, intervention_type, description, status, assigned_to, start_date, end_date } = body;
    const rows = await db.unsafe(
      `INSERT INTO interventions (tenant_id, student_id, academic_year_id, intervention_type, description, status, assigned_to, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [user.tenantId, student_id, academic_year_id, intervention_type || "remediation", description || null,
       status || "proposed", assigned_to || null, start_date || null, end_date || null],
    );
    return created(rows[0]);
  }, MANAGERS),

  route("PUT", "/api/interventions/:id", async ({ db, body, params }) => {
    const { intervention_type, description, status, assigned_to, start_date, end_date, outcome } = body;
    const rows = await db.unsafe(
      `UPDATE interventions SET intervention_type=$1, description=$2, status=$3, assigned_to=$4,
        start_date=$5, end_date=$6, outcome=$7 WHERE id=$8 RETURNING *`,
      [intervention_type, description, status, assigned_to, start_date, end_date, outcome, params.id],
    );
    return rows.length === 0 ? notFound() : ok(rows[0]);
  }, MANAGERS),

  route("DELETE", "/api/interventions/:id", async ({ db, params }) => {
    await db.unsafe("DELETE FROM interventions WHERE id=$1", [params.id]);
    return noContent();
  }, ADMINS),

  route("GET", "/api/dashboard", async ({ db, user }) => {
    const teacherScope = isTeacher(user);
    const scopeParams: any[] = teacherScope ? [user.userId] : [];
    const studentScope = teacherScope ? " AND class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = $1)" : "";
    const riskScope = teacherScope ? " AND student_id IN (SELECT id FROM students WHERE class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = $1))" : "";
    const interventionScope = riskScope;
    const classScope = teacherScope ? " AND id IN (SELECT class_id FROM class_subjects WHERE teacher_id = $1)" : "";

    const counts: Array<{ key: string; q: string }> = [
      { key: "students", q: `SELECT count(*) as c FROM students WHERE 1=1${studentScope}` },
      { key: "classes", q: `SELECT count(*) as c FROM classes WHERE 1=1${classScope}` },
      { key: "atRisk", q: `SELECT count(*) as c FROM risk_scores WHERE risk_level IN ('high','critical')${riskScope}` },
      { key: "activeInterventions", q: `SELECT count(*) as c FROM interventions WHERE status IN ('proposed','approved','active')${interventionScope}` },
    ];
    if (!teacherScope) {
      counts.push({ key: "teachers", q: "SELECT count(*) as c FROM users WHERE role='teacher'" });
      counts.push({ key: "subjects", q: "SELECT count(*) as c FROM subjects" });
    }

    const stats: Record<string, number> = {};
    for (const { key, q } of counts) {
      const rows = await db.unsafe(q, scopeParams);
      stats[key] = parseInt(rows[0].c);
    }
    return ok(stats);
  }),

  route("GET", "/api/audit-log", async ({ db, query }) => {
    const tableName = query.get("table_name");
    let q = "SELECT * FROM audit_log WHERE 1=1";
    const params: any[] = [];
    if (tableName) { params.push(tableName); q += ` AND table_name = $${params.length}`; }
    q += " ORDER BY created_at DESC LIMIT 100";
    return ok(await db.unsafe(q, params));
  }, ADMINS),

  route("GET", "/api/students/:id/report-card", async ({ db, user, params }) => {
    await assertTeacherCanSeeStudent(db, user, params.id);
    const student = await db.unsafe("SELECT * FROM students WHERE id=$1", [params.id]);
    if (student.length === 0) return notFound();
    const grades = await db.unsafe(
      `SELECT g.*, gi.title, gi.max_score, gi.weight, gi.grade_type,
              s.name as subject_name, s.coefficient
       FROM grades g
       JOIN grade_items gi ON gi.id = g.grade_item_id
       JOIN class_subjects cs ON cs.id = gi.class_subject_id
       JOIN subjects s ON s.id = cs.subject_id
       WHERE g.student_id = $1 ORDER BY s.name`,
      [params.id],
    );
    return ok({
      student: student[0],
      grades,
      verificationCode: crypto.randomUUID().substring(0, 12).toUpperCase(),
      generatedAt: new Date().toISOString(),
    });
  }),
];
