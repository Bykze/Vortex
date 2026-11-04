import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Spinner, ErrorBanner, EmptyState, Badge } from "@/components/ui";
import { ArrowLeft, Award, CheckSquare, LifeBuoy, TrendingDown } from "lucide-react";

const statusMap: Record<string, { label: string; color: string }> = {
  pre_admission: { label: "Pré-admission", color: "blue" },
  orientation: { label: "Orientation", color: "yellow" },
  active: { label: "Actif", color: "green" },
  special_status: { label: "Statut spécial", color: "yellow" },
  graduated: { label: "Diplômé", color: "blue" },
  transferred: { label: "Transféré", color: "gray" },
  expelled: { label: "Expulsé", color: "red" },
};

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [risk, setRisk] = useState<any>(null);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/api/students/${id}`),
      api.get(`/api/grades?student_id=${id}`),
      api.get(`/api/enrollments?student_id=${id}`),
      api.get(`/api/risk-scores?student_id=${id}`).catch(() => []),
      api.get(`/api/interventions?student_id=${id}`).catch(() => []),
      api.get(`/api/students/${id}/status-history`).catch(() => []),
    ]).then(([s, g, e, r, i, h]: any) => {
      setStudent(s); setGrades(g); setEnrollments(e);
      setRisk(Array.isArray(r) ? r[0] : null); setInterventions(i); setHistory(h);
      setLoading(false);
    }).catch((e) => { setError(e.message); setLoading(false); });
  }, [id]);

  if (loading) return <Spinner />;
  if (!student) return <ErrorBanner message="Élève introuvable" />;

  return (
    <div>
      <button onClick={() => navigate("/students")} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4">
        <ArrowLeft size={16} /> Retour
      </button>
      {error && <ErrorBanner message={error} />}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{student.last_name} {student.first_name}</h1>
          <p className="text-sm text-slate-500">{student.matricule} — Inscrit le {student.enrollment_date}</p>
        </div>
        <Badge color={statusMap[student.status]?.color || "gray"}>{statusMap[student.status]?.label || student.status}</Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center"><Award size={24} /></div>
          <div><div className="text-2xl font-bold">{grades.length}</div><div className="text-sm text-slate-500">Notes</div></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center"><CheckSquare size={24} /></div>
          <div><div className="text-2xl font-bold">{enrollments.length}</div><div className="text-sm text-slate-500">Inscriptions</div></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center"><TrendingDown size={24} /></div>
          <div><div className="text-2xl font-bold">{risk ? risk.risk_level : "—"}</div><div className="text-sm text-slate-500">Risque</div></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center"><LifeBuoy size={24} /></div>
          <div><div className="text-2xl font-bold">{interventions.length}</div><div className="text-sm text-slate-500">Interventions</div></div>
        </div>
      </div>
      {risk && (
        <div className="bg-white rounded-xl border-l-4 border-amber-500 border border-slate-200 p-5 mb-6">
          <h3 className="font-semibold mb-2">Évaluation du risque</h3>
          <div className="flex items-center gap-4">
            <Badge color={risk.risk_level === "critical" || risk.risk_level === "high" ? "red" : risk.risk_level === "moderate" ? "yellow" : "green"}>Risque {risk.risk_level}</Badge>
            <span className="text-sm text-slate-600">Score: {risk.risk_score?.toFixed(1)} — Assiduité: {risk.attendance_rate}% — Absences: {risk.absence_count}</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold mb-4">Notes récentes</h3>
          {grades.length === 0 ? <EmptyState title="Aucune note" message="—" /> : (
            <table className="w-full">
              <thead><tr className="border-b border-slate-200"><th className="text-left text-xs uppercase text-slate-500 py-2">Note</th><th className="text-left text-xs uppercase text-slate-500 py-2">Date</th></tr></thead>
              <tbody>
                {grades.slice(0, 10).map((g) => (
                  <tr key={g.id} className="border-b border-slate-100">
                    <td className="py-2 text-sm font-semibold">{g.is_absent ? <Badge color="yellow">Abs</Badge> : `${g.score}`}</td>
                    <td className="py-2 text-sm">{new Date(g.graded_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold mb-4">Historique des statuts</h3>
          {history.length === 0 ? <EmptyState title="Aucun changement" message="—" /> : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500">{new Date(h.changed_at).toLocaleDateString()}</span>
                  <Badge color="gray">{h.from_status || "—"}</Badge> → <Badge color="blue">{h.to_status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
