/*
# Restrict profile reads to safe columns

Plain-English summary
The profile table previously allowed the app to read every column, including the (now unused) password column.
This change removes the table-wide read permission and keeps only read access to non-sensitive profile columns.

Security changes
- Table-wide SELECT on `users` is revoked from the `authenticated` role.
- SELECT is granted only on: id, tenant_id, email, full_name, role, is_active, created_at, updated_at.
- The password column is never readable by the app.
*/

REVOKE SELECT ON users FROM authenticated;
GRANT SELECT (id, tenant_id, email, full_name, role, is_active, created_at, updated_at) ON users TO authenticated;
