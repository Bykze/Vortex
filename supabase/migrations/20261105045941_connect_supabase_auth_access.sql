/*
# Connect school data to Supabase Auth accounts

Plain-English summary
The app now signs people in with Supabase Auth instead of its own password table.
Each signed-in person is linked to one school (tenant) through the `users` table, whose id is the Supabase account id.
Data access is limited to the signed-in person's school, and school founders get the super_admin role.

Changes
1. `users.password_hash` becomes optional (no longer used; never granted to the app).
2. Old login helper functions `find_login_user` and `signup_create_tenant` are removed (replaced by Supabase Auth).
3. `current_tenant_id()` and `current_app_role()` now read the signed-in account's row in `users`.
4. New function `create_school_account(school_name, slug, full_name)` creates the school, its settings and the founder's profile in one step.
5. All old policies (written for an internal database role) are replaced by policies for the `authenticated` role, one policy per action.
6. Table privileges are reset and granted only for the actions the app uses.

Security notes
- Column `password_hash` is not readable by the app roles.
- Helper functions are executable only by signed-in users.
- Role rules (teacher scoping, locked grades) are enforced by the API layer and existing triggers.
*/

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS find_login_user(text, text);
DROP FUNCTION IF EXISTS signup_create_tenant(text, text, text, text, text);
DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS current_app_role() CASCADE;

CREATE FUNCTION current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT u.tenant_id FROM users u WHERE u.id = auth.uid() $$;

CREATE FUNCTION current_app_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT u.role FROM users u WHERE u.id = auth.uid() $$;

CREATE OR REPLACE FUNCTION create_school_account(p_school_name text, p_slug text, p_full_name text)
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_tenant_id uuid;
  v_user users;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE id = v_uid) THEN
    RAISE EXCEPTION 'This account already has a school' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM tenants WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'This school address is already taken' USING ERRCODE = '23505';
  END IF;
  SELECT au.email INTO v_email FROM auth.users au WHERE au.id = v_uid;
  INSERT INTO tenants (name, slug, plan, status) VALUES (p_school_name, p_slug, 'free', 'active')
    RETURNING id INTO v_tenant_id;
  INSERT INTO tenant_settings (tenant_id, plan, max_students, max_teachers, ai_enabled, school_name, locale)
    VALUES (v_tenant_id, 'free', 50, 10, false, p_school_name, 'fr');
  INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active)
    VALUES (v_uid, v_tenant_id, v_email, NULL, p_full_name, 'super_admin', true)
    RETURNING * INTO v_user;
  RETURN v_user;
END;
$$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON schools, academic_years, classes, subjects, students, grades, grade_items, progression_rules, risk_scores, interventions TO authenticated;
GRANT SELECT, INSERT, DELETE ON class_subjects, guardians, enrollments, attendance_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON attendance_records TO authenticated;
GRANT SELECT, INSERT ON student_status_history, audit_log TO authenticated;
GRANT INSERT ON payments TO authenticated;
GRANT SELECT, UPDATE ON tenants, tenant_settings TO authenticated;
GRANT SELECT ON users TO authenticated;
GRANT SELECT (id, tenant_id, email, full_name, role, is_active, created_at, updated_at) ON users TO authenticated;

DO $$
DECLARE
  spec record;
  verb text;
  i integer;
  cond text := '(tenant_id = current_tenant_id() OR current_app_role() = ''super_admin'')';
BEGIN
  FOR spec IN SELECT * FROM (VALUES
    ('schools', 'SIUD'), ('academic_years', 'SIUD'), ('classes', 'SIUD'), ('subjects', 'SIUD'),
    ('class_subjects', 'SID'), ('students', 'SIUD'), ('guardians', 'SID'), ('enrollments', 'SID'),
    ('grade_items', 'SIUD'), ('grades', 'SIUD'), ('attendance_sessions', 'SID'), ('attendance_records', 'SIU'),
    ('student_status_history', 'SI'), ('progression_rules', 'SIUD'), ('risk_scores', 'SIUD'),
    ('interventions', 'SIUD'), ('payments', 'I'), ('audit_log', 'SI'), ('tenant_settings', 'SU'), ('users', 'S')
  ) AS t(tbl, verbs)
  LOOP
    FOR i IN 1..length(spec.verbs) LOOP
      verb := substr(spec.verbs, i, 1);
      IF verb = 'S' THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING %s', spec.tbl || '_select_tenant', spec.tbl, cond);
      ELSIF verb = 'I' THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK %s', spec.tbl || '_insert_tenant', spec.tbl, cond);
      ELSIF verb = 'U' THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING %s WITH CHECK %s', spec.tbl || '_update_tenant', spec.tbl, cond, cond);
      ELSE
        EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO authenticated USING %s', spec.tbl || '_delete_tenant', spec.tbl, cond);
      END IF;
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY tenants_select_own ON tenants FOR SELECT TO authenticated
  USING (id = current_tenant_id() OR current_app_role() = 'super_admin');

CREATE POLICY tenants_update_super ON tenants FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin') WITH CHECK (current_app_role() = 'super_admin');

REVOKE EXECUTE ON FUNCTION create_school_account(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_school_account(text, text, text) TO authenticated;
