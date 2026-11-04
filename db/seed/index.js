import pg from "pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || "postgres://vortex_app:change_me@localhost:5432/vortex";
const pool = new Pool({ connectionString });

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Seeding database...");

    // ==================== TENANT A: Lycée Victor Hugo ====================
    const tenantAId = randomUUID();
    const schoolAId = randomUUID();
    const yearAId = randomUUID();
    const classAId = randomUUID();
    const subjectAMathId = randomUUID();
    const subjectAFrId = randomUUID();
    const csAMathId = randomUUID();
    const csAFrId = randomUUID();

    const hash = (pw) => bcrypt.hashSync(pw, 10);

    await client.query("BEGIN");
    // Use SET LOCAL to bypass RLS for seeding (super_admin context)
    await client.query(`SET LOCAL app.tenant_id = ''`);
    await client.query(`SET LOCAL app.role = 'super_admin'`);

    await client.query(
      "INSERT INTO tenants (id, name, slug, plan, status) VALUES ($1, $2, $3, 'premium', 'active')",
      [tenantAId, "Lycée Victor Hugo", "victor-hugo"]
    );
    await client.query(
      "INSERT INTO tenant_settings (tenant_id, plan, school_name, ai_enabled) VALUES ($1, 'premium', 'Lycée Victor Hugo', false)",
      [tenantAId]
    );
    await client.query(
      "INSERT INTO schools (id, tenant_id, name, code, city) VALUES ($1, $2, 'Lycée Victor Hugo', 'LVH', 'Paris')",
      [schoolAId, tenantAId]
    );
    await client.query(
      "INSERT INTO academic_years (id, tenant_id, school_id, name, start_date, end_date, is_current) VALUES ($1, $2, $3, '2026-2027', '2026-09-01', '2027-06-30', true)",
      [yearAId, tenantAId, schoolAId]
    );
    await client.query(
      "INSERT INTO classes (id, tenant_id, school_id, academic_year_id, name, level, capacity) VALUES ($1, $2, $3, $4, 'Terminale S', 'lycee', 35)",
      [classAId, tenantAId, schoolAId, yearAId]
    );
    await client.query("INSERT INTO subjects (id, tenant_id, school_id, name, code, coefficient) VALUES ($1, $2, $3, 'Mathématiques', 'MATH', 4.0)", [subjectAMathId, tenantAId, schoolAId]);
    await client.query("INSERT INTO subjects (id, tenant_id, school_id, name, code, coefficient) VALUES ($1, $2, $3, 'Français', 'FR', 2.0)", [subjectAFrId, tenantAId, schoolAId]);
    await client.query("INSERT INTO class_subjects (id, tenant_id, class_id, subject_id) VALUES ($1, $2, $3, $4)", [csAMathId, tenantAId, classAId, subjectAMathId]);
    await client.query("INSERT INTO class_subjects (id, tenant_id, class_id, subject_id) VALUES ($1, $2, $3, $4)", [csAFrId, tenantAId, classAId, subjectAFrId]);

    // Users for Tenant A
    const dirA = randomUUID();
    const teacherA = randomUUID();
    const studentAUser = randomUUID();
    await client.query("INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, 'direction@victor-hugo.fr', $3, 'Marie Curie', 'direction')", [dirA, tenantAId, hash("password123")]);
    await client.query("INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, 'prof@victor-hugo.fr', $3, 'Jean Valjean', 'teacher')", [teacherA, tenantAId, hash("password123")]);
    await client.query("INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, 'eleve@victor-hugo.fr', $3, 'Cosette Fauchelevent', 'student')", [studentAUser, tenantAId, hash("password123")]);
    await client.query("UPDATE class_subjects SET teacher_id = $1 WHERE id = $2", [teacherA, csAMathId]);

    // Students for Tenant A
    const studentA1 = randomUUID();
    const studentA2 = randomUUID();
    await client.query("INSERT INTO students (id, tenant_id, school_id, class_id, user_id, matricule, first_name, last_name, status) VALUES ($1, $2, $3, $4, $5, 'VH-001', 'Cosette', 'Fauchelevent', 'active')", [studentA1, tenantAId, schoolAId, classAId, studentAUser]);
    await client.query("INSERT INTO students (id, tenant_id, school_id, class_id, matricule, first_name, last_name, status) VALUES ($1, $2, $3, $4, 'VH-002', 'Gavroche', 'Thenardier', 'active')", [studentA2, tenantAId, schoolAId, classAId]);

    // Grades for Tenant A
    const giA1 = randomUUID();
    const giA2 = randomUUID();
    await client.query("INSERT INTO grade_items (id, tenant_id, class_subject_id, academic_year_id, title, grade_type, max_score, weight) VALUES ($1, $2, $3, $4, 'Examen 1', 'exam', 20, 2.0)", [giA1, tenantAId, csAMathId, yearAId]);
    await client.query("INSERT INTO grade_items (id, tenant_id, class_subject_id, academic_year_id, title, grade_type, max_score, weight) VALUES ($1, $2, $3, $4, 'Devoir 1', 'homework', 20, 1.0)", [giA2, tenantAId, csAFrId, yearAId]);
    await client.query("INSERT INTO grades (tenant_id, grade_item_id, student_id, score, graded_by) VALUES ($1, $2, $3, 14.5, $4)", [tenantAId, giA1, studentA1, teacherA]);
    await client.query("INSERT INTO grades (tenant_id, grade_item_id, student_id, score, graded_by) VALUES ($1, $2, $3, 9.0, $4)", [tenantAId, giA1, studentA2, teacherA]);
    await client.query("INSERT INTO grades (tenant_id, grade_item_id, student_id, score, graded_by) VALUES ($1, $2, $3, 16.0, $4)", [tenantAId, giA2, studentA1, teacherA]);

    // Attendance for Tenant A
    const sessA1 = randomUUID();
    await client.query("INSERT INTO attendance_sessions (id, tenant_id, class_subject_id, session_date, created_by) VALUES ($1, $2, $3, '2026-09-15', $4)", [sessA1, tenantAId, csAMathId, teacherA]);
    await client.query("INSERT INTO attendance_records (tenant_id, session_id, student_id, status) VALUES ($1, $2, $3, 'present')", [tenantAId, sessA1, studentA1]);
    await client.query("INSERT INTO attendance_records (tenant_id, session_id, student_id, status) VALUES ($1, $2, $3, 'absent')", [tenantAId, sessA1, studentA2]);

    // Risk score for Tenant A (student A2 is at risk)
    await client.query("INSERT INTO risk_scores (tenant_id, student_id, academic_year_id, risk_level, risk_score, grade_trend, attendance_rate, late_count, absence_count) VALUES ($1, $2, $3, 'high', 72.5, -1.2, 50, 0, 1)", [tenantAId, studentA2, yearAId]);
    await client.query("INSERT INTO interventions (tenant_id, student_id, academic_year_id, intervention_type, description, status) VALUES ($1, $2, $3, 'remediation', 'Soutien en mathématiques', 'active')", [tenantAId, studentA2, yearAId]);

    // Progression rules for Tenant A
    await client.query("INSERT INTO progression_rules (tenant_id, rule_key, rule_name, rule_value) VALUES ($1, 'passing_threshold', 'Seuil de passage', '{\"passing_grade\": 10, \"max_repetitions\": 2}')", [tenantAId]);

    await client.query("COMMIT");
    console.log("  ✓ Tenant A: Lycée Victor Hugo seeded");

    // ==================== TENANT B: École Les Lilas ====================
    const tenantBId = randomUUID();
    const schoolBId = randomUUID();
    const yearBId = randomUUID();
    const classBId = randomUUID();
    const subjectBMathId = randomUUID();
    const csBMathId = randomUUID();

    await client.query("BEGIN");
    await client.query(`SET LOCAL app.tenant_id = ''`);
    await client.query(`SET LOCAL app.role = 'super_admin'`);

    await client.query("INSERT INTO tenants (id, name, slug, plan, status) VALUES ($1, 'École Les Lilas', 'les-lilas', 'standard', 'active')", [tenantBId]);
    await client.query("INSERT INTO tenant_settings (tenant_id, plan, school_name) VALUES ($1, 'standard', 'École Les Lilas')", [tenantBId]);
    await client.query("INSERT INTO schools (id, tenant_id, name, code, city) VALUES ($1, $2, 'École Les Lilas', 'ELI', 'Lyon')", [schoolBId, tenantBId]);
    await client.query("INSERT INTO academic_years (id, tenant_id, school_id, name, start_date, end_date, is_current) VALUES ($1, $2, $3, '2026-2027', '2026-09-01', '2027-06-30', true)", [yearBId, tenantBId, schoolBId]);
    await client.query("INSERT INTO classes (id, tenant_id, school_id, academic_year_id, name, level, capacity) VALUES ($1, $2, $3, $4, 'CM2', 'primaire', 30)", [classBId, tenantBId, schoolBId, yearBId]);
    await client.query("INSERT INTO subjects (id, tenant_id, school_id, name, code, coefficient) VALUES ($1, $2, $3, 'Mathématiques', 'MATH-B', 3.0)", [subjectBMathId, tenantBId, schoolBId]);
    await client.query("INSERT INTO class_subjects (id, tenant_id, class_id, subject_id) VALUES ($1, $2, $3, $4)", [csBMathId, tenantBId, classBId, subjectBMathId]);

    const dirB = randomUUID();
    const teacherB = randomUUID();
    const studentBUser = randomUUID();
    await client.query("INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, 'direction@les-lilas.fr', $3, 'Pierre Durand', 'direction')", [dirB, tenantBId, hash("password123")]);
    await client.query("INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, 'prof@les-lilas.fr', $3, 'Sophie Martin', 'teacher')", [teacherB, tenantBId, hash("password123")]);
    await client.query("INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, 'eleve@les-lilas.fr', $3, 'Lucas Petit', 'student')", [studentBUser, tenantBId, hash("password123")]);
    await client.query("UPDATE class_subjects SET teacher_id = $1 WHERE id = $2", [teacherB, csBMathId]);

    const studentB1 = randomUUID();
    await client.query("INSERT INTO students (id, tenant_id, school_id, class_id, user_id, matricule, first_name, last_name, status) VALUES ($1, $2, $3, $4, $5, 'EL-001', 'Lucas', 'Petit', 'active')", [studentB1, tenantBId, schoolBId, classBId, studentBUser]);

    const giB1 = randomUUID();
    await client.query("INSERT INTO grade_items (id, tenant_id, class_subject_id, academic_year_id, title, grade_type, max_score, weight) VALUES ($1, $2, $3, $4, 'Contrôle 1', 'exam', 20, 1.0)", [giB1, tenantBId, csBMathId, yearBId]);
    await client.query("INSERT INTO grades (tenant_id, grade_item_id, student_id, score, graded_by) VALUES ($1, $2, $3, 15.0, $4)", [tenantBId, giB1, studentB1, teacherB]);

    const sessB1 = randomUUID();
    await client.query("INSERT INTO attendance_sessions (id, tenant_id, class_subject_id, session_date, created_by) VALUES ($1, $2, $3, '2026-09-16', $4)", [sessB1, tenantBId, csBMathId, teacherB]);
    await client.query("INSERT INTO attendance_records (tenant_id, session_id, student_id, status) VALUES ($1, $2, $3, 'present')", [tenantBId, sessB1, studentB1]);

    await client.query("COMMIT");
    console.log("  ✓ Tenant B: École Les Lilas seeded");

    // ==================== SUPER_ADMIN (global) ====================
    const superAdminId = randomUUID();
    await client.query("BEGIN");
    // Super admin is in tenant A but has super_admin role
    await client.query("INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, 'admin@vortex.app', $3, 'Admin Vortex', 'super_admin')", [superAdminId, tenantAId, hash("admin123")]);
    await client.query("COMMIT");
    console.log("  ✓ Super admin seeded");

    console.log("\nSeed complete! Login credentials:");
    console.log("  Super Admin:  admin@vortex.app / admin123");
    console.log("  Direction A:  direction@victor-hugo.fr / password123");
    console.log("  Teacher A:    prof@victor-hugo.fr / password123");
    console.log("  Student A:    eleve@victor-hugo.fr / password123");
    console.log("  Direction B:  direction@les-lilas.fr / password123");
    console.log("  Teacher B:    prof@les-lilas.fr / password123");
    console.log("  Student B:    eleve@les-lilas.fr / password123");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
