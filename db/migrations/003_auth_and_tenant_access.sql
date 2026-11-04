-- ============================================================
-- Migration 003: Authentication and tenant access
-- ============================================================
--
-- 1. Why this migration exists
--    Login, signup and refresh need to touch tables (users, tenants,
--    refresh_tokens) before any tenant is known. Row level security blocks
--    those queries, so login and signup always failed.
--
-- 2. Changes
--    - refresh_tokens gets a tenant_id column (nullable: old rows stay as they are).
--    - refresh_tokens gets a tenant isolation policy, like every other tenant table.
--    - find_login_user(): looks up an account by email (and optional school slug)
--      for the login route only. Runs with the owner's rights.
--    - signup_create_tenant(): creates a school, its settings and its first
--      super_admin in a single atomic call. Returns no row if the slug is taken.
--
-- 3. Security notes
--    - Both functions are SECURITY DEFINER with a fixed search_path.
--    - EXECUTE is revoked from PUBLIC and granted only to the app role.
--    - The signup function always creates the super_admin role; callers cannot choose it.
--
-- 4. Idempotency
--    Every statement can be re-run safely.

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

DROP POLICY IF EXISTS refresh_tokens_tenant_isolation ON refresh_tokens;
CREATE POLICY refresh_tokens_tenant_isolation ON refresh_tokens FOR ALL
  TO vortex_app
  USING (tenant_id = current_tenant_id() OR current_app_role() = 'super_admin')
  WITH CHECK (tenant_id = current_tenant_id() OR current_app_role() = 'super_admin');

CREATE OR REPLACE FUNCTION find_login_user(p_email text, p_slug text)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  email text,
  password_hash text,
  full_name text,
  role text,
  is_active boolean,
  tenant_status text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.id, u.tenant_id, u.email, u.password_hash, u.full_name, u.role, u.is_active, t.status
  FROM users u
  JOIN tenants t ON t.id = u.tenant_id
  WHERE u.email = p_email
    AND (p_slug IS NULL OR t.slug = p_slug)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION signup_create_tenant(
  p_tenant_name text,
  p_tenant_slug text,
  p_email text,
  p_password_hash text,
  p_full_name text
)
RETURNS TABLE (
  out_user_id uuid,
  out_tenant_id uuid,
  out_email text,
  out_full_name text,
  out_role text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM tenants WHERE slug = p_tenant_slug) THEN
    RETURN;
  END IF;

  INSERT INTO tenants (name, slug) VALUES (p_tenant_name, p_tenant_slug)
    RETURNING id INTO v_tenant_id;

  INSERT INTO tenant_settings (tenant_id, school_name) VALUES (v_tenant_id, p_tenant_name);

  INSERT INTO users (tenant_id, email, password_hash, full_name, role)
    VALUES (v_tenant_id, p_email, p_password_hash, p_full_name, 'super_admin')
    RETURNING id INTO v_user_id;

  RETURN QUERY SELECT v_user_id, v_tenant_id, p_email, p_full_name, 'super_admin'::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION find_login_user(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION signup_create_tenant(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_login_user(text, text) TO vortex_app;
GRANT EXECUTE ON FUNCTION signup_create_tenant(text, text, text, text, text) TO vortex_app;
