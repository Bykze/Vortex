import { tenantHandler } from "../middleware/tenant.js";
import { isTeacher, assertTeacherOwnsClassSubject, assertTeacherOwnsGradeItem, assertTeacherOwnsSession, assertTeacherCanSeeStudent, } from "../lib/teacherScope.js";
export async function registerTeacherRoutes(app) {
    // ==================== CLASS SUBJECTS ====================
    app.get("/api/class-subjects", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
        const user = req.user;
        const { class_id } = req.query;
        let q = `SELECT cs.*, s.name as subject_name, s.code as subject_code, s.coefficient,
             c.name as class_name, u.full_name as teacher_name
             FROM class_subjects cs
             JOIN subjects s ON s.id = cs.subject_id
             JOIN classes c ON c.id = cs.class_id
             LEFT JOIN users u ON u.id = cs.teacher_id
             WHERE 1=1`;
        const params = [];
        if (class_id) {
            params.push(class_id);
            q += ` AND cs.class_id = $${params.length}`;
        }
        if (isTeacher(user)) {
            params.push(user.userId);
            q += ` AND cs.teacher_id = $${params.length}`;
        }
        q += " ORDER BY s.name";
        const { rows } = await client.query(q, params);
        return reply.send(rows);
    }));
    app.post("/api/class-subjects", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff")] }, tenantHandler(async (req, reply, client) => {
        const { class_id, subject_id, teacher_id } = req.body;
        const { rows } = await client.query("INSERT INTO class_subjects (tenant_id, class_id, subject_id, teacher_id) VALUES (current_tenant_id(), $1, $2, $3) RETURNING *", [class_id, subject_id, teacher_id || null]);
        return reply.code(201).send(rows[0]);
    }));
    app.delete("/api/class-subjects/:id", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff")] }, tenantHandler(async (req, reply, client) => {
        const { id } = req.params;
        await client.query("DELETE FROM class_subjects WHERE id=$1", [id]);
        return reply.code(204).send();
    }));
    // ==================== GRADE ITEMS ====================
    app.get("/api/grade-items", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
        const user = req.user;
        const { class_subject_id, academic_year_id } = req.query;
        let q = "SELECT gi.* FROM grade_items gi JOIN class_subjects cs ON cs.id = gi.class_subject_id WHERE 1=1";
        const params = [];
        if (class_subject_id) {
            params.push(class_subject_id);
            q += ` AND gi.class_subject_id = $${params.length}`;
        }
        if (academic_year_id) {
            params.push(academic_year_id);
            q += ` AND gi.academic_year_id = $${params.length}`;
        }
        if (isTeacher(user)) {
            params.push(user.userId);
            q += ` AND cs.teacher_id = $${params.length}`;
        }
        q += " ORDER BY gi.created_at";
        const { rows } = await client.query(q, params);
        return reply.send(rows);
    }));
    app.post("/api/grade-items", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff", "teacher")] }, tenantHandler(async (req, reply, client) => {
        const user = req.user;
        const { class_subject_id, academic_year_id, title, grade_type, max_score, weight } = req.body;
        await assertTeacherOwnsClassSubject(client, user, class_subject_id);
        const { rows } = await client.query("INSERT INTO grade_items (tenant_id, class_subject_id, academic_year_id, title, grade_type, max_score, weight) VALUES (current_tenant_id(), $1, $2, $3, $4, $5, $6) RETURNING *", [class_subject_id, academic_year_id, title, grade_type || "exam", max_score || 20, weight || 1.0]);
        return reply.code(201).send(rows[0]);
    }));
    app.put("/api/grade-items/:id", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff", "teacher")] }, tenantHandler(async (req, reply, client) => {
        const user = req.user;
        const { id } = req.params;
        const { title, grade_type, max_score, weight } = req.body;
        await assertTeacherOwnsGradeItem(client, user, id);
        const { rows: existing } = await client.query("SELECT period_closed FROM grade_items WHERE id=$1", [id]);
        if (existing.length === 0)
            return reply.code(404).send({ error: "Not found" });
        if (existing[0].period_closed) {
            if (user.role !== "direction" && user.role !== "super_admin") {
                return reply.code(403).send({ error: "Ces notes ont été envoyées à l'administration. Seule la direction peut les rouvrir." });
            }
        }
        const { rows } = await client.query("UPDATE grade_items SET title=$1, grade_type=$2, max_score=$3, weight=$4 WHERE id=$5 RETURNING *", [title, grade_type, max_score, weight, id]);
        return reply.send(rows[0]);
    }));
    app.delete("/api/grade-items/:id", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff")] }, tenantHandler(async (req, reply, client) => {
        const { id } = req.params;
        await client.query("DELETE FROM grade_items WHERE id=$1", [id]);
        return reply.code(204).send();
    }));
    // Send grades to administration (locks the period)
    app.post("/api/grade-items/:id/close", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff", "teacher")] }, tenantHandler(async (req, reply, client) => {
        const user = req.user;
        const { id } = req.params;
        await assertTeacherOwnsGradeItem(client, user, id);
        const { rows } = await client.query("UPDATE grade_items SET period_closed=true WHERE id=$1 RETURNING *", [id]);
        return reply.send(rows[0]);
    }));
    // Reopen locked grades: level-2 administration only
    app.post("/api/grade-items/:id/reopen", { preHandler: [app.auth, app.requireRole("super_admin", "direction")] }, tenantHandler(async (req, reply, client) => {
        const { id } = req.params;
        const { rows } = await client.query("UPDATE grade_items SET period_closed=false WHERE id=$1 RETURNING *", [id]);
        return reply.send(rows[0]);
    }));
    // ==================== GRADES ====================
    app.get("/api/grades", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
        const user = req.user;
        const { grade_item_id, student_id } = req.query;
        let q = `SELECT g.* FROM grades g
             JOIN grade_items gi ON gi.id = g.grade_item_id
             JOIN class_subjects cs ON cs.id = gi.class_subject_id
             WHERE 1=1`;
        const params = [];
        if (grade_item_id) {
            params.push(grade_item_id);
            q += ` AND g.grade_item_id = $${params.length}`;
        }
        if (student_id) {
            params.push(student_id);
            q += ` AND g.student_id = $${params.length}`;
        }
        if (isTeacher(user)) {
            params.push(user.userId);
            q += ` AND cs.teacher_id = $${params.length}`;
        }
        const { rows } = await client.query(q, params);
        return reply.send(rows);
    }));
    app.post("/api/grades", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff", "teacher")] }, tenantHandler(async (req, reply, client) => {
        const { grade_item_id, student_id, score, is_absent, comment } = req.body;
        const user = req.user;
        await assertTeacherOwnsGradeItem(client, user, grade_item_id);
        await assertTeacherCanSeeStudent(client, user, student_id);
        const { rows: gi } = await client.query("SELECT period_closed FROM grade_items WHERE id=$1", [grade_item_id]);
        if (gi.length > 0 && gi[0].period_closed && user.role !== "direction" && user.role !== "super_admin") {
            return reply.code(403).send({ error: "Ces notes ont été envoyées à l'administration. Seule la direction peut les modifier." });
        }
        const { rows } = await client.query(`INSERT INTO grades (tenant_id, grade_item_id, student_id, score, is_absent, comment, graded_by)
       VALUES (current_tenant_id(), $1, $2, $3, $4, $5, $6)
       ON CONFLICT (grade_item_id, student_id) DO UPDATE SET score=$3, is_absent=$4, comment=$5, graded_by=$6, graded_at=now()
       RETURNING *`, [grade_item_id, student_id, score, is_absent || false, comment || null, user.userId]);
        return reply.code(201).send(rows[0]);
    }));
    app.delete("/api/grades/:id", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff")] }, tenantHandler(async (req, reply, client) => {
        const { id } = req.params;
        await client.query("DELETE FROM grades WHERE id=$1", [id]);
        return reply.code(204).send();
    }));
    // ==================== ATTENDANCE ====================
    app.get("/api/attendance-sessions", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
        const user = req.user;
        const { class_subject_id } = req.query;
        let q = `SELECT s.* FROM attendance_sessions s
             JOIN class_subjects cs ON cs.id = s.class_subject_id
             WHERE 1=1`;
        const params = [];
        if (class_subject_id) {
            params.push(class_subject_id);
            q += ` AND s.class_subject_id = $${params.length}`;
        }
        if (isTeacher(user)) {
            params.push(user.userId);
            q += ` AND cs.teacher_id = $${params.length}`;
        }
        q += " ORDER BY s.session_date DESC";
        const { rows } = await client.query(q, params);
        return reply.send(rows);
    }));
    app.post("/api/attendance-sessions", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff", "teacher")] }, tenantHandler(async (req, reply, client) => {
        const { class_subject_id, session_date } = req.body;
        const user = req.user;
        await assertTeacherOwnsClassSubject(client, user, class_subject_id);
        const { rows } = await client.query("INSERT INTO attendance_sessions (tenant_id, class_subject_id, session_date, created_by) VALUES (current_tenant_id(), $1, $2, $3) RETURNING *", [class_subject_id, session_date, user.userId]);
        return reply.code(201).send(rows[0]);
    }));
    app.delete("/api/attendance-sessions/:id", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff")] }, tenantHandler(async (req, reply, client) => {
        const { id } = req.params;
        await client.query("DELETE FROM attendance_sessions WHERE id=$1", [id]);
        return reply.code(204).send();
    }));
    app.get("/api/attendance-records", { preHandler: [app.auth] }, tenantHandler(async (req, reply, client) => {
        const user = req.user;
        const { session_id, student_id } = req.query;
        let q = `SELECT ar.* FROM attendance_records ar
             JOIN attendance_sessions s ON s.id = ar.session_id
             JOIN class_subjects cs ON cs.id = s.class_subject_id
             WHERE 1=1`;
        const params = [];
        if (session_id) {
            params.push(session_id);
            q += ` AND ar.session_id = $${params.length}`;
        }
        if (student_id) {
            params.push(student_id);
            q += ` AND ar.student_id = $${params.length}`;
        }
        if (isTeacher(user)) {
            params.push(user.userId);
            q += ` AND cs.teacher_id = $${params.length}`;
        }
        const { rows } = await client.query(q, params);
        return reply.send(rows);
    }));
    app.post("/api/attendance-records", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff", "teacher")] }, tenantHandler(async (req, reply, client) => {
        const { session_id, student_id, status, notes } = req.body;
        const user = req.user;
        await assertTeacherOwnsSession(client, user, session_id);
        await assertTeacherCanSeeStudent(client, user, student_id);
        const { rows } = await client.query(`INSERT INTO attendance_records (tenant_id, session_id, student_id, status, notes)
       VALUES (current_tenant_id(), $1, $2, $3, $4)
       ON CONFLICT (session_id, student_id) DO UPDATE SET status=$3, notes=$4
       RETURNING *`, [session_id, student_id, status || "present", notes || null]);
        return reply.code(201).send(rows[0]);
    }));
    // Batch attendance (array of records)
    app.post("/api/attendance-records/batch", { preHandler: [app.auth, app.requireRole("super_admin", "direction", "staff", "teacher")] }, tenantHandler(async (req, reply, client) => {
        const user = req.user;
        const { records } = req.body;
        const results = [];
        for (const r of records) {
            await assertTeacherOwnsSession(client, user, r.session_id);
            await assertTeacherCanSeeStudent(client, user, r.student_id);
            const { rows } = await client.query(`INSERT INTO attendance_records (tenant_id, session_id, student_id, status)
         VALUES (current_tenant_id(), $1, $2, $3)
         ON CONFLICT (session_id, student_id) DO UPDATE SET status=$3
         RETURNING *`, [r.session_id, r.student_id, r.status]);
            results.push(rows[0]);
        }
        return reply.code(201).send(results);
    }));
}
//# sourceMappingURL=teacher.js.map