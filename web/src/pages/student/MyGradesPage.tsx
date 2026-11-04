import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Spinner, EmptyState, Badge } from "@/components/ui";
import { Award } from "lucide-react";

export default function MyGradesPage() {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would filter by the logged-in student's user_id
    api.get("/api/grades").then(setGrades).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Mes notes" />
      {grades.length === 0 ? <EmptyState title="Aucune note" message="Vos notes apparaîtront ici." /> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Note</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Absence</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Date</th>
            </tr></thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-sm">{g.score}</td>
                  <td className="px-4 py-3">{g.is_absent ? <Badge color="yellow">Absent</Badge> : <Badge color="green">Présent</Badge>}</td>
                  <td className="px-4 py-3 text-sm">{new Date(g.graded_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
