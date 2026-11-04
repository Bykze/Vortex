-- ============================================================
-- Vortex School Management — Migration 001: Core schema
-- Multi-tenant, RLS, immutable fields, audit log
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vortex_app') THEN
    CREATE ROLE vortex_app WITH LOGIN PASSWORD 'change_me';
  END IF;
END $$;

ALTER ROLE vortex_app SET row_security = on;

CREATE TABLE IF NOT EXISTS tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  plan        text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','standard','premium')),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','expired')),
  expires_at  timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id       uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  plan            text NOT NULL DEFAULT 'free',
  max_students    int  NOT NULL DEFAULT 500,
  max_teachers    int  NOT NULL DEFAULT 50,
  ai_enabled      boolean NOT NULL DEFAULT false,
  school_name     text,
  school_logo_url text,
  locale          text NOT NULL DEFAULT 'fr',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         text NOT NULL,
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  role          text NOT NULL CHECK (role IN ('super_admin','direction','staff','teacher','student','guardian')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS schools (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  code        text NOT NULL,
  address     text,
  city        text,
  phone       text,
  email       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS academic_years (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        text NOT NULL,
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  is_current  boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name        text NOT NULL,
  level       text NOT NULL,
  capacity    int  NOT NULL DEFAULT 40,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        text NOT NULL,
  code        text NOT NULL,
  coefficient float NOT NULL DEFAULT 1.0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS class_subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS students (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id       uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id        uuid REFERENCES classes(id) ON DELETE SET NULL,
  user_id         uuid REFERENCES users(id) ON DELETE SET NULL,
  matricule       text NOT NULL,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  date_of_birth   date,
  gender          text CHECK (gender IN ('M','F','other')),
  phone           text,
  address         text,
  status          text NOT NULL DEFAULT 'pre_admission'
                  CHECK (status IN ('pre_admission','orientation','active','special_status','graduated','transferred','expelled')),
  enrollment_date date NOT NULL DEFAULT CURRENT_DATE,
  previous_education text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(tenant_id, matricule)
);

CREATE TABLE IF NOT EXISTS guardians (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  full_name   text NOT NULL,
  phone       text,
  email       text,
  relation    text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_subject_id uuid NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled','completed','dropped')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(student_id, class_subject_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS grade_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_subject_id uuid NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  title           text NOT NULL,
  grade_type      text NOT NULL DEFAULT 'exam' CHECK (grade_type IN ('exam','quiz','homework','project','participation','final','rattrapage')),
  max_score       float NOT NULL DEFAULT 20,
  weight          float NOT NULL DEFAULT 1.0,
  period_closed   boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grades (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grade_item_id uuid NOT NULL REFERENCES grade_items(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score         float NOT NULL,
  is_absent     boolean NOT NULL DEFAULT false,
  comment       text,
  graded_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  graded_at     timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(grade_item_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_subject_id uuid NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,
  session_date    date NOT NULL,
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','excused')),
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(session_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_status text,
  to_status   text NOT NULL,
  reason      text,
  changed_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS progression_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_id       uuid REFERENCES schools(id) ON DELETE CASCADE,
  rule_key        text NOT NULL,
  rule_name       text NOT NULL,
  rule_value      jsonb NOT NULL DEFAULT '{}',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_scores (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id        uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id  uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  risk_level        text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','moderate','high','critical')),
  risk_score        float NOT NULL DEFAULT 0,
  grade_trend       float DEFAULT 0,
  attendance_rate   float DEFAULT 100,
  late_count        int  DEFAULT 0,
  absence_count     int  DEFAULT 0,
  contributing_factors jsonb DEFAULT '[]',
  assessed_at       timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interventions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id        uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id  uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  intervention_type text NOT NULL DEFAULT 'remediation' CHECK (intervention_type IN ('remediation','tutoring','counseling','parent_notification','disciplinary','rattrapage')),
  description       text,
  status            text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','active','completed','cancelled')),
  assigned_to       uuid REFERENCES users(id) ON DELETE SET NULL,
  start_date        date,
  end_date          date,
  outcome           text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount      float NOT NULL,
  currency    text NOT NULL DEFAULT 'EUR',
  payment_method text,
  recorded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  paid_at     timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  table_name  text NOT NULL,
  operation   text NOT NULL,
  row_id      uuid,
  changed_by  uuid,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked     boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_tenant ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_item ON grades(grade_item_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_risk_student ON risk_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);

CREATE OR REPLACE FUNCTION block_immutable_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'tenant_id is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_users ON users;
CREATE TRIGGER trg_immutable_users BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION block_immutable_update();

CREATE OR REPLACE FUNCTION raise_immutable()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is immutable', TG_ARGV[0];
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_students ON students;
DROP TRIGGER IF EXISTS trg_immutable_students_matricule ON students;
CREATE TRIGGER trg_immutable_students BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION block_immutable_update();

CREATE TRIGGER trg_immutable_students_matricule BEFORE UPDATE ON students
  FOR EACH ROW
  WHEN (NEW.matricule IS DISTINCT FROM OLD.matricule)
  EXECUTE FUNCTION raise_immutable('matricule');

CREATE OR REPLACE FUNCTION block_class_id_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.class_id IS DISTINCT FROM OLD.class_id THEN
    RAISE EXCEPTION 'class_id is immutable after assignment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_class ON students;
CREATE TRIGGER trg_immutable_class BEFORE UPDATE ON students
  FOR EACH ROW
  WHEN (NEW.class_id IS DISTINCT FROM OLD.class_id AND OLD.class_id IS NOT NULL)
  EXECUTE FUNCTION block_class_id_change();

CREATE OR REPLACE FUNCTION block_audit_modification()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is insert-only: UPDATE and DELETE are not allowed';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_audit_update ON audit_log;
CREATE TRIGGER trg_block_audit_update BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION block_audit_modification();

DROP TRIGGER IF EXISTS trg_block_audit_delete ON audit_log;
CREATE TRIGGER trg_block_audit_delete BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION block_audit_modification();

CREATE OR REPLACE FUNCTION audit_grade_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (tenant_id, table_name, operation, row_id, new_data, changed_by)
    VALUES (NEW.tenant_id, 'grades', 'INSERT', NEW.id, to_jsonb(NEW), NULL);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (tenant_id, table_name, operation, row_id, old_data, new_data, changed_by)
    VALUES (NEW.tenant_id, 'grades', 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW), NULL);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_grades ON grades;
CREATE TRIGGER trg_audit_grades AFTER INSERT OR UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION audit_grade_change();

CREATE OR REPLACE FUNCTION audit_attendance_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (tenant_id, table_name, operation, row_id, new_data)
    VALUES (NEW.tenant_id, 'attendance_records', 'INSERT', NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (tenant_id, table_name, operation, row_id, old_data, new_data)
    VALUES (NEW.tenant_id, 'attendance_records', 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_attendance ON attendance_records;
CREATE TRIGGER trg_audit_attendance AFTER INSERT OR UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION audit_attendance_change();

CREATE OR REPLACE FUNCTION audit_student_status()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO audit_log (tenant_id, table_name, operation, row_id, old_data, new_data)
    VALUES (NEW.tenant_id, 'students', 'STATUS_CHANGE', NEW.id,
      jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
    INSERT INTO student_status_history (tenant_id, student_id, from_status, to_status)
    VALUES (NEW.tenant_id, NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_student_status ON students;
CREATE TRIGGER trg_audit_student_status AFTER UPDATE ON students
  FOR EACH ROW WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION audit_student_status();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END $$;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_app_role()
RETURNS text AS $$
  SELECT COALESCE(current_setting('app.role', true), '');
$$ LANGUAGE sql STABLE;

CREATE POLICY tenants_select ON tenants FOR SELECT
  TO vortex_app USING (
    current_app_role() = 'super_admin' OR id = current_tenant_id()
  );

CREATE POLICY tenants_all_admin ON tenants FOR ALL
  TO vortex_app USING (
    current_app_role() = 'super_admin'
  ) WITH CHECK (
    current_app_role() = 'super_admin'
  );

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'tenant_id' AND table_schema = 'public'
      AND table_name NOT IN ('tenants')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_tenant_isolation', tbl);
    EXECUTE format($f$
      CREATE POLICY %1$I ON %1$I FOR ALL
      TO vortex_app
      USING (tenant_id = current_tenant_id() OR current_app_role() = 'super_admin')
      WITH CHECK (tenant_id = current_tenant_id() OR current_app_role() = 'super_admin')
    $f$, tbl);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO vortex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vortex_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vortex_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO vortex_app;

CREATE OR REPLACE FUNCTION validate_student_status_transition()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'pre_admission' AND NEW.status IN ('orientation','active','expelled')) OR
      (OLD.status = 'orientation'    AND NEW.status IN ('active','special_status','expelled')) OR
      (OLD.status = 'active'         AND NEW.status IN ('special_status','graduated','transferred','expelled')) OR
      (OLD.status = 'special_status' AND NEW.status IN ('active','graduated','transferred','expelled'))
    ) THEN
      RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_status ON students;
CREATE TRIGGER trg_validate_status BEFORE UPDATE ON students
  FOR EACH ROW WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION validate_student_status_transition();
