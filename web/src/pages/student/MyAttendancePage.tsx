import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Spinner, EmptyState, Badge } from "@/components/ui";
import { CalendarCheck } from "lucide-react";

export default function MyAttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/attendance-records").then(setRecords).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 100;

  const statusBadge: Record<string, { color: string; label: string }> = {
    present: { color: "green", label: "Présent" }, absent: { color: "red", label: "Absent" },
    late: { color: "yellow", label: "Retard" }, excused: { color: "blue", label: "Excusé" },
  };

  return (
    <div>
      <PageHeader title="Mes présences" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center"><div className="text-3xl font-bold text-green-600">{rate}%</div><div className="text-sm text-slate-500 mt-1">Taux de présence</div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center"><div className="text-3xl font-bold">{present}</div><div className="text-sm text-slate-500 mt-1">Présents</div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center"><div className="text-3xl font-bold text-red-600">{absent}</div><div className="text-sm text-slate-500 mt-1">Absences</div></div>
      </div>
      {records.length === 0 ? <EmptyState title="Aucun enregistrement" message="Votre historique apparaîtra ici." /> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-200"><th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Date</th><th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Statut</th></tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-sm">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><Badge color={statusBadge[r.status]?.color || "gray"}>{statusBadge[r.status]?.label || r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
