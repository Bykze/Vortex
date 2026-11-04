-- Migration 005: Close direct API access to login and signup functions
-- find_login_user returns password hashes and must not be callable by anon or authenticated over HTTP.
-- signup_create_tenant is only needed by the API server. vortex_app keeps EXECUTE.

REVOKE EXECUTE ON FUNCTION find_login_user(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION signup_create_tenant(text, text, text, text, text) FROM anon, authenticated;
