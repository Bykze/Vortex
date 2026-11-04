import { tenantHandler } from "../middleware/tenant.js";
import { isTeacher, assertTeacherCanSeeStudent } from "../lib/teacherScope.js";
export async function registerMonitoringRoutes(app) {
    // ==================== RISK SCORES ====================
    app.get("/api/risk-scores", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
        const user = req.user;
        const { risk_level, academic_year_id } = req.query;
        let q = `SELECT rs.*, s.first_name, s.last_name, s.matricule
             FROM risk_scores rs
             JOIN students s ON s.id = rs.student_id
             WHERE 1=1`;
        const params = [];
        if (risk_level) {
            params.push(risk_level);
            q += ` AND rs.risk_level = ${params.length}`;
        }
        if (academic_year_id) {
            params.push(academic_year_id);
            q += ` AND rs.academic_year_id = ${params.length}`;
        }
        if (isTeacher(user)) {
            params.push(user.userId);
            q += ` AND s.class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = ${params.length})`;
        }
        q += " ORDER BY rs.risk_score DESC";
        const { rows } = await client.query(q, params);
        return reply.send(rows);
    }));
    app.post("/api/risk-scores", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff")] }, tenantHandler(async (req, reply, client) => {
        const { student_id, academic_year_id, risk_level, risk_score, grade_trend, attendance_rate, late_count, absence_count, contributing_factors } = req.body;
        const { rows } = await client.query(`INSERT INTO risk_scores (tenant_id, student_id, academic_year_id, risk_level, risk_score, grade_trend, attendance_rate, late_count, absence_count, contributing_factors)
       VALUES (current_tenant_id(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [student_id, academic_year_id, risk_level || "low", risk_score || 0,
            grade_trend || 0, attendance_rate || 100, late_count || 0, absence_count || 0,
            JSON.stringify(contributing_factors || [])]);
        return reply.code(201).send(rows[0]);
    }));
    app.put("/api/risk-scores/:id", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff")] }, tenantHandler(async (req, reply, client) => {
        const { id } = req.params;
        const { risk_level, risk_score, grade_trend, attendance_rate, late_count, absence_count, contributing_factors } = req.body;
        const { rows } = await client.query(`UPDATE risk_scores SET risk_level=$1, risk_score=$2, grade_trend=$3, attendance_rate=$4,
        late_count=$5, absence_count=$6, contributing_factors=$7, assessed_at=now()
       WHERE id=$8 RETURNING *`, [risk_level, risk_score, grade_trend, attendance_rate, late_count, absence_count,
            JSON.stringify(contributing_factors || []), id]);
        if (rows.length === 0)
            return reply.code(404).send({ error: "Not found" });
        return reply.send(rows[0]);
    }));
    app.delete("/api/risk-scores/:id", { preHandler: [app.auth, app.requireRole("super_admin", "direction")] }, tenantHandler(async (req, reply, client) => {
        const { id } = req.params;
        await client.query("DELETE FROM risk_scores WHERE id=$1", [id]);
        return reply.code(204).send();
    }));
    // ==================== INTERVENTIONS ====================
    app.get("/api/interventions", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
        const user = req.user;
        const { student_id, status } = req.query;
        let q = `SELECT i.*, s.first_name, s.last_name, s.matricule
             FROM interventions i
             JOIN students s ON s.id = i.student_id
             WHERE 1=1`;
        const params = [];
        if (student_id) {
            params.push(student_id);
            q += ` AND i.student_id = ${params.length}`;
        }
        if (status) {
            params.push(status);
            q += ` AND i.status = ${params.length}`;
        }
        if (isTeacher(user)) {
            params.push(user.userId);
            q += ` AND s.class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = ${params.length})`;
        }
        q += " ORDER BY i.created_at DESC";
        const { rows } = await client.query(q, params);
        return reply.send(rows);
    }));
    app.post("/api/interventions", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff")] }, tenantHandler(async (req, reply, client) => {
        const { student_id, academic_year_id, intervention_type, description, status, assigned_to, start_date, end_date } = req.body;
        const { rows } = await client.query(`INSERT INTO interventions (tenant_id, student_id, academic_year_id, intervention_type, description, status, assigned_to, start_date, end_date)
       VALUES (current_tenant_id(), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [student_id, academic_year_id, intervention_type || "remediation", description || null,
            status || "proposed", assigned_to || null, start_date || null, end_date || null]);
        return reply.code(201).send(rows[0]);
    }));
    app.put("/api/interventions/:id", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff")] }, tenantHandler(async (req, reply, client) => {
        const { id } = req.params;
        const { intervention_type, description, status, assigned_to, start_date, end_date, outcome } = req.body;
        const { rows } = await client.query(`UPDATE interventions SET intervention_type=$1, description=$2, status=$3, assigned_to=$4,
        start_date=$5, end_date=$6, outcome=$7 WHERE id=$8 RETURNING *`, [intervention_type, description, status, assigned_to, start_date, end_date, outcome, id]);
        if (rows.length === 0)
            return reply.code(404).send({ error: "Not found" });
        return reply.send(rows[0]);
    }));
    app.delete("/api/interventions/:id", { preHandler: [app.auth, app.requireRole("super_admin", "direction")] }, tenantHandler(async (req, reply, client) => {
        const { id } = req.params;
        await client.query("DELETE FROM interventions WHERE id=$1", [id]);
        return reply.code(204).send();
    }));
    // ==================== DASHBOARD STATS ====================
    app.get("/api/dashboard", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
        const user = req.user;
        const stats = {};
        const teacherScope = isTeacher(user);
        const scopeParams = teacherScope ? [user.userId] : [];
        const studentScope = teacherScope ? " AND class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = $1)" : "";
        const riskScope = teacherScope ? " AND student_id IN (SELECT id FROM students WHERE class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = $1))" : "";
        const interventionScope = teacherScope ? " AND student_id IN (SELECT id FROM students WHERE class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = $1))" : "";
        const classScope = teacherScope ? " AND id IN (SELECT class_id FROM class_subjects WHERE teacher_id = $1)" : "";
        const counts = [
            { key: "students", q: `SELECT count(*) as c FROM students WHERE 1=1${studentScope}` },
            { key: "classes", q: `SELECT count(*) as c FROM classes WHERE 1=1${classScope}` },
            { key: "atRisk", q: `SELECT count(*) as c FROM risk_scores WHERE risk_level IN ('high','critical')${riskScope}` },
            { key: "activeInterventions", q: `SELECT count(*) as c FROM interventions WHERE status IN ('proposed','approved','active')${interventionScope}` },
            ...(teacherScope ? [] : [
                { key: "teachers", q: "SELECT count(*) as c FROM users WHERE role='teacher'" },
                { key: "subjects", q: "SELECT count(*) as c FROM subjects" },
            ]),
        ];
        for (const { key, q } of counts) {
            const { rows } = await client.query(q, scopeParams);
            stats[key] = parseInt(rows[0].c);
        }
        return reply.send(stats);
    }));
    // ==================== AUDIT LOG ====================
    app.get("/api/audit-log", { preHandler: [app.auth, app.requireRole("super_admin", "direction")] }, tenantHandler(async (req, reply, client) => {
        const { table_name } = req.query;
        let q = "SELECT * FROM audit_log WHERE 1=1";
        const params = [];
        if (table_name) {
            params.push(table_name);
            q += ` AND table_name = $${params.length}`;
        }
        q += " ORDER BY created_at DESC LIMIT 100";
        const { rows } = await client.query(q, params);
        return reply.send(rows);
    }));
    // ==================== REPORT CARD (PDF placeholder) ====================
    app.get("/api/students/:id/report-card", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
        const user = req.user;
        const { id } = req.params;
        await assertTeacherCanSeeStudent(client, user, id);
        const { rows: student } = await client.query("SELECT * FROM students WHERE id=$1", [id]);
        if (student.length === 0)
            return reply.code(404).send({ error: "Not found" });
        const { rows: grades } = await client.query(`SELECT g.*, gi.title, gi.max_score, gi.weight, gi.grade_type,
              s.name as subject_name, s.coefficient
       FROM grades g
       JOIN grade_items gi ON gi.id = g.grade_item_id
       JOIN class_subjects cs ON cs.id = gi.class_subject_id
       JOIN subjects s ON s.id = cs.subject_id
       WHERE g.student_id = $1 ORDER BY s.name`, [id]);
        // Generate a unique verification code
        const crypto = await import("crypto");
        const verifyCode = crypto.randomUUID().substring(0, 12).toUpperCase();
        return reply.send({
            student: student[0],
            grades,
            verificationCode: verifyCode,
            generatedAt: new Date().toISOString(),
        });
    }));
}
//# sourceMappingURL=monitoring.js.map