import { HttpError, ok, route, type Db, type Route } from "../http.ts";

export const authRoutes: Route[] = [
  route("GET", "/api/auth/me", async ({ user }) =>
    ok({
      id: user.userId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
    })),
];

export async function createSchool(db: Db, body: any) {
  const schoolName = String(body?.tenantName ?? "").trim();
  const slug = String(body?.tenantSlug ?? "").trim().toLowerCase();
  const fullName = String(body?.fullName ?? "").trim();
  if (!schoolName || !slug || !fullName) throw new HttpError(400, "Tous les champs sont requis");
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new HttpError(400, "L'identifiant ne peut contenir que des lettres minuscules, chiffres et tirets");
  }
  const rows = await db.unsafe(
    "SELECT id, tenant_id, email, full_name, role FROM create_school_account($1, $2, $3)",
    [schoolName, slug, fullName],
  );
  const r = rows[0];
  return {
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    role: r.role,
    tenantId: r.tenant_id,
  };
}
