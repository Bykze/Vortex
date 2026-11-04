import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Spinner, ErrorBanner, EmptyState, Badge } from "@/components/ui";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/api/audit-log").then((d) => { setLogs(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Journal d'audit" />
      {error && <ErrorBanner message={error} />}
      {logs.length === 0 ? <EmptyState title="Aucune entrée" message="Les modifications seront journalisées ici." /> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Table</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Opération</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">ID ligne</th>
            </tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-sm">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-medium">{l.table_name}</td>
                  <td className="px-4 py-3"><Badge color={l.operation === "INSERT" ? "green" : l.operation === "UPDATE" ? "yellow" : l.operation === "STATUS_CHANGE" ? "orange" : "gray"}>{l.operation}</Badge></td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">{l.row_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
