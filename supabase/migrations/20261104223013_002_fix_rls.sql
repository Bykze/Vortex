ALTER TABLE guardians DISABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guardians_tenant_isolation ON guardians;
CREATE POLICY guardians_tenant_isolation ON guardians FOR ALL
  TO vortex_app
  USING (tenant_id = current_tenant_id() OR current_app_role() = 'super_admin')
  WITH CHECK (tenant_id = current_tenant_id() OR current_app_role() = 'super_admin');

DROP POLICY IF EXISTS audit_log_tenant_isolation ON audit_log;
CREATE POLICY audit_log_tenant_isolation ON audit_log FOR SELECT
  TO vortex_app
  USING (tenant_id = current_tenant_id() OR current_app_role() = 'super_admin');

DROP POLICY IF EXISTS audit_log_insert ON audit_log;
CREATE POLICY audit_log_insert ON audit_log FOR INSERT
  TO vortex_app
  WITH CHECK (true);
