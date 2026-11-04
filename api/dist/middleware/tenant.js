import { withTenant } from "../db/pool.js";
/**
 * Wraps a route handler in a tenant-scoped transaction.
 * Sets app.tenant_id and app.role for RLS.
 */
export function tenantHandler(handler) {
    return async (req, reply) => {
        const user = req.user;
        if (!user) {
            return reply.code(401).send({ error: "Not authenticated" });
        }
        try {
            return await withTenant(user.tenantId, user.role, (client) => handler(req, reply, client));
        }
        catch (err) {
            // If reply was already sent, just log
            if (reply.sent)
                return;
            const code = err.statusCode || 500;
            return reply.code(code).send({ error: err.message || "Internal server error" });
        }
    };
}
/**
 * Public handler (no tenant context) — for login, signup, super_admin operations.
 */
export function publicHandler(handler) {
    return async (req, reply) => {
        try {
            return await handler(req, reply);
        }
        catch (err) {
            if (reply.sent)
                return;
            const code = err.statusCode || 500;
            return reply.code(code).send({ error: err.message || "Internal server error" });
        }
    };
}
//# sourceMappingURL=tenant.js.map