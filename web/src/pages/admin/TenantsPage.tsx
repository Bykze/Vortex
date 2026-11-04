import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Spinner, ErrorBanner, Badge } from "@/components/ui";
import type { Tenant, TenantSettings } from "@/types";
import { Shield, CreditCard, Settings as SettingsIcon } from "lucide-react";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/api/tenants").then((d) => { setTenants(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Tenants (SaaS)" />
      {error && <ErrorBanner message={error} />}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-slate-200">
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">École</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Slug</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Plan</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Statut</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Expiration</th>
          </tr></thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-sm">{t.name}</td>
                <td className="px-4 py-3 text-sm"><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{t.slug}</code></td>
                <td className="px-4 py-3"><Badge color={t.plan === "premium" ? "green" : t.plan === "standard" ? "blue" : "gray"}>{t.plan}</Badge></td>
                <td className="px-4 py-3"><Badge color={t.status === "active" ? "green" : t.status === "expired" ? "red" : "yellow"}>{t.status}</Badge></td>
                <td className="px-4 py-3 text-sm">{t.expires_at ? new Date(t.expires_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
