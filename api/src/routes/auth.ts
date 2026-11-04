import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { pool, withTenant } from "../db/pool.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, authMiddleware, type JwtPayload } from "../middleware/auth.js";
import type { FastifyRequest, FastifyReply } from "fastify";
import { publicHandler } from "../middleware/tenant.js";

const REFRESH_TOKEN_DAYS = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueSession(user: { id: string; tenant_id: string; role: string; email: string }) {
  const payload: JwtPayload = {
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    email: user.email,
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await withTenant(user.tenant_id, user.role, (client) =>
    client.query(
      `INSERT INTO refresh_tokens (tenant_id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, now() + make_interval(days => $4))`,
      [user.tenant_id, user.id, hashToken(refreshToken), REFRESH_TOKEN_DAYS]
    )
  );

  return { accessToken, refreshToken };
}

export async function registerRoutes(app: import("fastify").FastifyInstance) {
  app.post("/api/auth/login", publicHandler(async (req: FastifyRequest, reply: FastifyReply) => {
    const { email, password, tenantSlug } = req.body as { email: string; password: string; tenantSlug?: string };

    if (!email || !password) {
      return reply.code(400).send({ error: "Email and password required" });
    }

    const { rows } = await pool.query("SELECT * FROM find_login_user($1, $2)", [email, tenantSlug || null]);
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

    const session = await issueSession(user);
    return reply.send({
      ...session,
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, tenantId: user.tenant_id },
    });
  }));

  app.post("/api/auth/signup", publicHandler(async (req: FastifyRequest, reply: FastifyReply) => {
    const { email, password, fullName, tenantName, tenantSlug } = req.body as {
      email: string; password: string; fullName: string; tenantName?: string; tenantSlug?: string;
    };

    if (!email || !password || !fullName) {
      return reply.code(400).send({ error: "Email, password, and full name required" });
    }
    if (!tenantName || !tenantSlug) {
      return reply.code(400).send({ error: "tenantName and tenantSlug required for signup" });
    }

    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || "10"));
    const { rows } = await pool.query(
      "SELECT * FROM signup_create_tenant($1, $2, $3, $4, $5)",
      [tenantName, tenantSlug, email, hash, fullName]
    );
    if (rows.length === 0) {
      return reply.code(409).send({ error: "Tenant slug already exists" });
    }

    const created = rows[0];
    const session = await issueSession({
      id: created.out_user_id, tenant_id: created.out_tenant_id, role: created.out_role, email: created.out_email,
    });
    return reply.send({
      ...session,
      user: {
        id: created.out_user_id, email: created.out_email, fullName: created.out_full_name,
        role: created.out_role, tenantId: created.out_tenant_id,
      },
    });
  }));

  app.post("/api/auth/refresh", publicHandler(async (req: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = req.body as { refreshToken: string };
    if (!refreshToken) return reply.code(400).send({ error: "refreshToken required" });

    let decoded: JwtPayload;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return reply.code(401).send({ error: "Invalid refresh token" });
    }

    const { rows } = await withTenant(decoded.tenantId, decoded.role, (client) =>
      client.query(
        "SELECT id FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > now()",
        [hashToken(refreshToken)]
      )
    );
    if (rows.length === 0) {
      return reply.code(401).send({ error: "Invalid refresh token" });
    }

    const accessToken = signAccessToken({
      userId: decoded.userId, tenantId: decoded.tenantId, role: decoded.role, email: decoded.email,
    });
    return reply.send({ accessToken });
  }));

  app.get("/api/auth/me", {
    preHandler: [authMiddleware],
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user as JwtPayload;
    return reply.send({
      id: user.userId, tenantId: user.tenantId, role: user.role, email: user.email,
    });
  });
}
