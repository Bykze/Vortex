import Fastify from "fastify";
import cors from "@fastify/cors";
import { authMiddleware, requireRole } from "./middleware/auth.js";
import { registerRoutes as registerAuthRoutes } from "./routes/auth.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerTeacherRoutes } from "./routes/teacher.js";
import { registerStudentRoutes } from "./routes/student.js";
import { registerMonitoringRoutes } from "./routes/monitoring.js";

const app = Fastify({ logger: true });

// Decorate with auth helpers so routes can use preHandler: [app.auth]
(app as any).decorate("auth", authMiddleware);
(app as any).decorate("requireRole", requireRole);

// CORS
await app.register(cors, {
  origin: true,
  credentials: true,
});

// Error handler
app.setErrorHandler((err, _req, reply) => {
  app.log.error(err);
  const code = err.statusCode || 500;
  reply.code(code).send({ error: err.message || "Internal server error" });
});

// Register routes
await registerAuthRoutes(app);
await registerAdminRoutes(app);
await registerTeacherRoutes(app);
await registerStudentRoutes(app);
await registerMonitoringRoutes(app);

// Health check
app.get("/api/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

const port = parseInt(process.env.API_PORT || "4000");
const host = process.env.API_HOST || "0.0.0.0";

app.listen({ port, host }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`Vortex API running at ${address}`);
});

export default app;
