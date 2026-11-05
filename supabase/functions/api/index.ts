import postgres from "npm:postgres@3.4.5";
import { HttpError, matchRoute, type Db, type Profile, type Result, type Route } from "./http.ts";
import { adminRoutes } from "./routes/admin.ts";
import { authRoutes, createSchool } from "./routes/auth.ts";
import { monitoringRoutes } from "./routes/monitoring.ts";
import { studentRoutes } from "./routes/students.ts";
import { teachingRoutes } from "./routes/teaching.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const routes: Route[] = [
  ...authRoutes,
  ...adminRoutes,
  ...teachingRoutes,
  ...studentRoutes,
  ...monitoringRoutes,
];

// Prepared statements are disabled because the connection goes through Supavisor's transaction pooler.
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 5 });

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Accepts "/schools", "/api/schools" or "/functions/v1/api/schools" and returns "/api/schools".
function normalizePath(pathname: string) {
  let p = pathname.replace(/^\/functions\/v1\/api(?=\/|$)/, "");
  if (p === "/api" || p.startsWith("/api/")) p = p.slice(4);
  return `/api${p.startsWith("/") ? p : `/${p}`}`;
}

async function verifyUser(token: string): Promise<{ id: string } | null> {
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
    headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ? { id: user.id } : null;
}

// Runs the rest of the transaction as the authenticated role so RLS policies apply.
async function actAsAuthenticated(tx: Db, userId: string) {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  await tx.unsafe("SELECT set_config('request.jwt.claims', $1, true)", [claims]);
  await tx.unsafe("SET LOCAL ROLE authenticated");
}

async function loadProfile(tx: Db): Promise<Profile | null> {
  const rows = await tx.unsafe(
    "SELECT id, tenant_id, email, full_name, role FROM users WHERE id = auth.uid()",
  );
  const r = rows[0];
  if (!r) return null;
  return { userId: r.id, tenantId: r.tenant_id, role: r.role, email: r.email, fullName: r.full_name };
}

function errorResponse(err: unknown) {
  if (err instanceof HttpError) return json(err.status, { error: err.message });
  const code = (err as { code?: string })?.code;
  if (code === "23505") return json(409, { error: "Cette donnée existe déjà" });
  if (code === "23514" || code === "22P02") return json(400, { error: "Données invalides" });
  if (code === "42501") return json(403, { error: "Action non autorisée" });
  console.error(err);
  return json(500, { error: "Erreur serveur" });
}

async function handle(req: Request): Promise<Response> {
  const method = req.method;
  if (method === "OPTIONS") return json(200);

  const url = new URL(req.url);
  const path = normalizePath(url.pathname);
  if (method === "GET" && path === "/api/health") return json(200, { status: "ok" });

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Non authentifié" });
  const authUser = await verifyUser(token);
  if (!authUser) return json(401, { error: "Session invalide ou expirée" });

  const body = await req.json().catch(() => ({}));

  const result: Result = await sql.begin(async (tx): Promise<Result> => {
    await actAsAuthenticated(tx, authUser.id);

    if (method === "POST" && path === "/api/auth/signup") {
      return { status: 201, body: await createSchool(tx, body) };
    }

    const user = await loadProfile(tx);
    if (!user) return { status: 403, body: { error: "Ce compte n'est rattaché à aucune école" } };

    const matched = matchRoute(routes, method, path);
    if (!matched) return { status: 404, body: { error: "Route introuvable" } };
    const { route, params } = matched;
    if (route.roles && !route.roles.includes(user.role)) {
      return { status: 403, body: { error: "Accès refusé" } };
    }
    return route.handler({ db: tx, user, body, params, query: url.searchParams });
  });

  return json(result.status, result.body);
}

Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch (err) {
    return errorResponse(err);
  }
});
