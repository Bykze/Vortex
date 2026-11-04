-- ============================================================
-- Migration 005: Close direct API access to login and signup functions
-- ============================================================
--
-- 1. Why this migration exists
--    find_login_user and signup_create_tenant are SECURITY DEFINER functions
--    meant to be called only by the API server (role vortex_app). Migration 003
--    revoked PUBLIC, but the data API roles anon and authenticated kept their
--    own EXECUTE grant, so anyone could call them over HTTP. find_login_user
--    returns password hashes, which must never be reachable that way.
--
-- 2. Changes
--    - EXECUTE on find_login_user and signup_create_tenant is revoked from anon and authenticated.
--
-- 3. Security notes
--    - vortex_app keeps EXECUTE, so the API login and signup routes keep working.
--
-- 4. Idempotency
--    REVOKE can be re-run safely.

REVOKE EXECUTE ON FUNCTION find_login_user(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION signup_create_tenant(text, text, text, text, text) FROM anon, authenticated;
