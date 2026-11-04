import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Spinner, ErrorBanner, EmptyState, Modal, Badge } from "@/components/ui";
import { Plus, Trash2, Save } from "lucide-react";
import type { ClassSubject } from "@/types";

const statuses = [
  { value: "present", label: "Présent", color: "green" },
  { value: "absent", label: "Absent", color: "red" },
  { value: "late", label: "Retard", color: "yellow" },
  { value: "excused", label: "Excusé", color: "blue" },
];

export default function AttendancePage() {
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [selectedCS, setSelectedCS] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [records, setRecords] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/api/class-subjects").then((d) => { setClassSubjects(d); if (d.length > 0) setSelectedCS(d[0].id); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selectedCS) return;
    Promise.all([api.get(`/api/attendance-sessions?class_subject_id=${selectedCS}`), api.get("/api/students")])
      .then(([ss, st]: any) => { setSessions(ss); setStudents(st); })
      .catch((e) => setError(e.message));
  }, [selectedCS]);

  async function createSession() {
    setSaving(true);
    try {
      await api.post("/api/attendance-sessions", { class_subject_id: selectedCS, session_date: sessionDate });
      setShowSessionModal(false);
      const ss = await api.get(`/api/attendance-sessions?class_subject_id=${selectedCS}`);
      setSessions(ss);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function deleteSession(id: string) {
    if (!confirm("Supprimer cette séance ?")) return;
    await api.del(`/api/attendance-sessions/${id}`);
    const ss = await api.get(`/api/attendance-sessions?class_subject_id=${selectedCS}`);
    setSessions(ss);
  }

  async function openRecordsModal(session: any) {
    setActiveSession(session);
    const recs = await api.get(`/api/attendance-records?session_id=${session.id}`);
    const vals: Record<string, string> = {};
    recs.forEach((r: any) => { vals[r.student_id] = r.status; });
    setRecords(vals);
    setShowRecordsModal(true);
  }

  async function saveAttendance() {
    setSaving(true);
    const batch = Object.entries(records).map(([student_id, status]) => ({ session_id: activeSession.id, student_id, status }));
    await api.post("/api/attendance-records/batch", { records: batch });
    setSaving(false);
    setShowRecordsModal(false);
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Présences" action={
        <button onClick={() => setShowSessionModal(true)} disabled={!selectedCS}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          <Plus size={16} /> Nouvelle séance
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
        sessions.length === 0 ? <EmptyState title="Aucune séance" message="Créez une séance de présence." /> : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-sm">{s.session_date}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openRecordsModal(s)} className="px-3 py-1.5 text-xs font-medium bg-slate-100 rounded-lg hover:bg-slate-200">Faire l'appel</button>
                        <button onClick={() => deleteSession(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {showSessionModal && (
        <Modal title="Nouvelle séance" onClose={() => setShowSessionModal(false)}
          footer={<><button onClick={() => setShowSessionModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Annuler</button>
            <button onClick={createSession} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">{saving ? "..." : "Créer"}</button></>}>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
            <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
        </Modal>
      )}
      {showRecordsModal && activeSession && (
        <Modal title={`Appel — ${activeSession.session_date}`} onClose={() => setShowRecordsModal(false)}
          footer={<><button onClick={() => setShowRecordsModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Annuler</button>
            <button onClick={saveAttendance} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">{saving ? "..." : "Enregistrer"}</button></>}>
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{s.last_name} {s.first_name}</span>
              <div className="flex gap-2">
                {statuses.map((st) => (
                  <button key={st.value} onClick={() => setRecords({ ...records, [s.id]: st.value })}
                    className={`px-3 py-1 text-xs font-medium rounded-lg ${records[s.id] === st.value ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
