import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { signAccessToken, signRefreshToken } from "../middleware/auth.js";
import { publicHandler } from "../middleware/tenant.js";
export async function registerRoutes(app) {
    // LOGIN
    app.post("/api/auth/login", publicHandler(async (req, reply) => {
        const { email, password, tenantSlug } = req.body;
        if (!email || !password) {
            return reply.code(400).send({ error: "Email and password required" });
        }
        // Find user by email — try across tenants (tenant determined by slug or first match)
        let queryText = `
      SELECT u.id, u.tenant_id, u.email, u.password_hash, u.full_name, u.role, u.is_active, t.status as tenant_status
      FROM users u JOIN tenants t ON t.id = u.tenant_id
      WHERE u.email = $1
    `;
        const params = [email];
        if (tenantSlug) {
            queryText += ` AND t.slug = $2`;
            params.push(tenantSlug);
        }
        queryText += ` LIMIT 1`;
        const { rows } = await pool.query(queryText, params);
        if (rows.length === 0) {
            return reply.code(401).send({ error: "Invalid credentials" });
        }
        const user = rows[0];
        if (!user.is_active) {
            return reply.code(403).send({ error: "Account disabled" });
        }
        if (user.tenant_status === "expired" && user.role !== "super_admin") {
            return reply.code(403).send({ error: "Subscription expired. Contact your administrator." });
        }
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return reply.code(401).send({ error: "Invalid credentials" });
        }
        const payload = {
            userId: user.id,
            tenantId: user.tenant_id,
            role: user.role,
            email: user.email,
        };
        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);
        // Store refresh token hash
        const tokenHash = await bcrypt.hash(refreshToken, 10);
        await pool.query("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '7 days')", [user.id, tokenHash]);
        return reply.send({
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, tenantId: user.tenant_id },
        });
    }));
    // SIGNUP (creates a new tenant + super_admin, or a user within existing tenant)
    app.post("/api/auth/signup", publicHandler(async (req, reply) => {
        const { email, password, fullName, tenantName, tenantSlug } = req.body;
        if (!email || !password || !fullName) {
            return reply.code(400).send({ error: "Email, password, and full name required" });
        }
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            let tenantId;
            if (tenantName && tenantSlug) {
                // New tenant onboarding
                const { rows: existing } = await client.query("SELECT id FROM tenants WHERE slug = $1", [tenantSlug]);
                if (existing.length > 0) {
                    await client.query("ROLLBACK");
                    return reply.code(409).send({ error: "Tenant slug already exists" });
                }
                const { rows: tr } = await client.query("INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id", [tenantName, tenantSlug]);
                tenantId = tr[0].id;
                await client.query("INSERT INTO tenant_settings (tenant_id, school_name) VALUES ($1, $2)", [tenantId, tenantName]);
            }
            else {
                return reply.code(400).send({ error: "tenantName and tenantSlug required for signup" });
            }
            const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || "10"));
            const { rows: ur } = await client.query("INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, 'super_admin') RETURNING id, email, full_name, role", [tenantId, email, hash, fullName]);
            await client.query("COMMIT");
            const payload = {
                userId: ur[0].id, tenantId, role: ur[0].role, email: ur[0].email,
            };
            return reply.send({
                accessToken: signAccessToken(payload),
                refreshToken: signRefreshToken(payload),
                user: { id: ur[0].id, email: ur[0].email, fullName: ur[0].full_name, role: ur[0].role, tenantId },
            });
        }
        catch (err) {
            await client.query("ROLLBACK");
            if (err.code === "23505") {
                return reply.code(409).send({ error: "Email already registered in this tenant" });
            }
            throw err;
        }
        finally {
            client.release();
        }
    }));
    // REFRESH
    app.post("/api/auth/refresh", publicHandler(async (req, reply) => {
        const { refreshToken } = req.body;
        if (!refreshToken)
            return reply.code(400).send({ error: "refreshToken required" });
        let payload;
        try {
            payload = (await import("jsonwebtoken")).verify(refreshToken, process.env.JWT_REFRESH_SECRET || "dev_refresh_change_me");
        }
        catch {
            return reply.code(401).send({ error: "Invalid refresh token" });
        }
        const accessToken = signAccessToken(payload);
        return reply.send({ accessToken });
    }));
    // ME (get current user info)
    app.get("/api/auth/me", {
        preHandler: [requireAuth],
    }, async (req, reply) => {
        const user = req.user;
        return reply.send({
            id: user.userId, tenantId: user.tenantId, role: user.role, email: user.email,
        });
    });
}
// Lazy import to avoid circular dependency
import { authMiddleware as requireAuth } from "../middleware/auth.js";
//# sourceMappingURL=auth.js.map