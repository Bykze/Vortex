-- ============================================================
-- Migration 002: Fix RLS typo + ensure audit_log tenant isolation
-- ============================================================

-- Fix the typo from migration 001
ALTER TABLE guardians DISABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;

-- Re-apply the tenant isolation policy for guardians (the DO block in 001 skipped it due to the typo)
DROP POLICY IF EXISTS guardians_tenant_isolation ON guardians;
CREATE POLICY guardians_tenant_isolation ON guardians FOR ALL
  TO vortex_app
  USING (tenant_id = current_tenant_id() OR current_app_role() = 'super_admin')
  WITH CHECK (tenant_id = current_tenant_id() OR current_app_role() = 'super_admin');

-- Ensure audit_log has the policy too
DROP POLICY IF EXISTS audit_log_tenant_isolation ON audit_log;
CREATE POLICY audit_log_tenant_isolation ON audit_log FOR SELECT
  TO vortex_app
  USING (tenant_id = current_tenant_id() OR current_app_role() = 'super_admin');

-- audit_log is insert-only via trigger, but vortex_app needs INSERT
DROP POLICY IF EXISTS audit_log_insert ON audit_log;
CREATE POLICY audit_log_insert ON audit_log FOR INSERT
  TO vortex_app
  WITH CHECK (true);
