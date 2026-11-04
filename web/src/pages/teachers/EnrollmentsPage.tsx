import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Spinner, ErrorBanner, EmptyState, Modal, Badge } from "@/components/ui";
import { UserPlus, Trash2 } from "lucide-react";
import type { ClassSubject, Student } from "@/types";

export default function EnrollmentsPage() {
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [selectedCS, setSelectedCS] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [academicYearId, setAcademicYearId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/api/class-subjects"), api.get("/api/students")])
      .then(([cs, st]: any) => { setClassSubjects(cs); setStudents(st); if (cs.length > 0) setSelectedCS(cs[0].id); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selectedCS) return;
    api.get(`/api/enrollments?class_subject_id=${selectedCS}`).then(setEnrollments).catch((e) => setError(e.message));
  }, [selectedCS]);

  const enrolledIds = new Set(enrollments.map((e) => e.student_id));
  const available = students.filter((s) => !enrolledIds.has(s.id) && s.status === "active");

  function toggle(id: string) {
    const next = new Set(selected); if (next.has(id)) next.delete(id); else next.add(id); setSelected(next);
  }

  async function enroll() {
    setSaving(true);
    for (const sid of selected) {
      await api.post("/api/enrollments", { student_id: sid, class_subject_id: selectedCS, academic_year_id: academicYearId });
    }
    setSaving(false); setShowModal(false); setSelected(new Set());
    const en = await api.get(`/api/enrollments?class_subject_id=${selectedCS}`);
    setEnrollments(en);
  }

  async function unenroll(id: string) {
    if (!confirm("Désinscrire ?")) return;
    await api.del(`/api/enrollments/${id}`);
    const en = await api.get(`/api/enrollments?class_subject_id=${selectedCS}`);
    setEnrollments(en);
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Inscriptions" action={
        <button onClick={() => setShowModal(true)} disabled={!selectedCS || available.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          <UserPlus size={16} /> Inscrire
        </button>
      } />
      {error && <ErrorBanner message={error} />}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <select value={selectedCS} onChange={(e) => setSelectedCS(e.target.value)}
          className="w-full md:w-96 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">— Choisir —</option>
          {classSubjects.map((cs) => <option key={cs.id} value={cs.id}>{cs.class_name} — {cs.subject_name}</option>)}
        </select>
      </div>
      {!selectedCS ? <EmptyState title="Sélection requise" message="Choisissez une matière." /> :
        enrollments.length === 0 ? <EmptyState title="Aucun inscrit" message="Inscrivez des élèves." /> : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Matricule</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Statut</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr></thead>
              <tbody>
                {enrollments.map((e) => {
                  const s = students.find((st) => st.id === e.student_id);
                  return (
                    <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm">{s?.matricule || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-sm">{s ? `${s.last_name} ${s.first_name}` : "—"}</td>
                      <td className="px-4 py-3"><Badge color="blue">{e.status}</Badge></td>
                      <td className="px-4 py-3 text-right"><button onClick={() => unenroll(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={16} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      {showModal && (
        <Modal title="Inscrire des élèves" onClose={() => setShowModal(false)}
          footer={<><button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Annuler</button>
            <button onClick={enroll} disabled={saving || selected.size === 0} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">{saving ? "..." : `Inscrire (${selected.size})`}</button></>}>
          <div className="mb-4"><label className="block text-sm font-medium text-slate-700 mb-1">Année académique ID *</label>
            <input value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} placeholder="UUID"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          {available.map((s) => (
            <label key={s.id} className="flex items-center gap-3 mb-2 cursor-pointer">
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="w-4 h-4 rounded border-slate-300 text-primary-600" />
              <span className="text-sm">{s.last_name} {s.first_name} — {s.matricule}</span>
            </label>
          ))}
        </Modal>
      )}
    </div>
  );
}
