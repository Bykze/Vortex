import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Spinner, ErrorBanner, EmptyState, Modal, Badge } from "@/components/ui";
import { Plus, Lock, Unlock, Pencil, Trash2, Save } from "lucide-react";
import type { GradeItem, Grade, ClassSubject } from "@/types";

export default function GradesPage() {
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [selectedCS, setSelectedCS] = useState("");
  const [items, setItems] = useState<GradeItem[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [activeItem, setActiveItem] = useState<GradeItem | null>(null);
  const [itemForm, setItemForm] = useState({ title: "", grade_type: "exam", max_score: 20, weight: 1.0, academic_year_id: "" });
  const [gradeValues, setGradeValues] = useState<Record<string, string>>({});
  const [students, setStudents] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/api/class-subjects").then((d) => { setClassSubjects(d); if (d.length > 0) setSelectedCS(d[0].id); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selectedCS) return;
    Promise.all([api.get(`/api/grade-items?class_subject_id=${selectedCS}`), api.get("/api/students")])
      .then(([gi, st]: any) => { setItems(gi); setStudents(st); })
      .catch((e) => setError(e.message));
  }, [selectedCS]);

  useEffect(() => {
    if (items.length > 0) {
      Promise.all(items.map((gi) => api.get(`/api/grades?grade_item_id=${gi.id}`)))
        .then((all) => { setGrades(all.flat()); })
        .catch((e) => setError(e.message));
    }
  }, [items]);

  function openCreateItem() {
    setItemForm({ title: "", grade_type: "exam", max_score: 20, weight: 1.0, academic_year_id: "" });
    setShowItemModal(true);
  }

  async function saveItem() {
    setSaving(true); setError(null);
    try {
      await api.post("/api/grade-items", { ...itemForm, class_subject_id: selectedCS });
      setShowItemModal(false);
      const gi = await api.get(`/api/grade-items?class_subject_id=${selectedCS}`);
      setItems(gi);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function toggleClose(item: GradeItem) {
    if (item.period_closed) {
      await api.post(`/api/grade-items/${item.id}/reopen`);
    } else {
      await api.post(`/api/grade-items/${item.id}/close`);
    }
    const gi = await api.get(`/api/grade-items?class_subject_id=${selectedCS}`);
    setItems(gi);
  }

  async function deleteItem(id: string) {
    if (!confirm("Supprimer cette évaluation ?")) return;
    await api.del(`/api/grade-items/${id}`);
    const gi = await api.get(`/api/grade-items?class_subject_id=${selectedCS}`);
    setItems(gi);
  }

  function openGradesModal(item: GradeItem) {
    setActiveItem(item);
    const vals: Record<string, string> = {};
    grades.filter((g) => g.grade_item_id === item.id).forEach((g) => {
      vals[g.student_id] = g.is_absent ? "abs" : String(g.score);
    });
    setGradeValues(vals);
    setShowGradesModal(true);
  }

  async function saveGrades() {
    if (!activeItem) return;
    setSaving(true);
    for (const [studentId, val] of Object.entries(gradeValues)) {
      const isAbs = val === "abs";
      const score = isAbs ? 0 : parseFloat(val) || 0;
      await api.post("/api/grades", { grade_item_id: activeItem.id, student_id: studentId, score, is_absent: isAbs });
    }
    setSaving(false);
    setShowGradesModal(false);
    const all = await Promise.all(items.map((gi) => api.get(`/api/grades?grade_item_id=${gi.id}`)));
    setGrades(all.flat());
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Carnet de notes" action={
        <button onClick={openCreateItem} disabled={!selectedCS}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          <Plus size={16} /> Nouvelle évaluation
        </button>
      } />
      {error && <ErrorBanner message={error} />}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <select value={selectedCS} onChange={(e) => setSelectedCS(e.target.value)}
          className="w-full md:w-96 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">— Choisir une matière —</option>
          {classSubjects.map((cs) => <option key={cs.id} value={cs.id}>{cs.class_name} — {cs.subject_name}</option>)}
        </select>
      </div>
      {!selectedCS ? <EmptyState title="Sélection requise" message="Choisissez une matière." /> :
        items.length === 0 ? <EmptyState title="Aucune évaluation" message="Créez une évaluation." /> : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto mb-6">
            <table className="w-full">
              <thead><tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Évaluation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Max</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Coeff</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Période</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-sm">{item.title}</td>
                    <td className="px-4 py-3 text-sm">{item.grade_type}</td>
                    <td className="px-4 py-3 text-sm">{item.max_score}</td>
                    <td className="px-4 py-3 text-sm">{item.weight}</td>
                    <td className="px-4 py-3">{item.period_closed ? <Badge color="red">Verrouillée</Badge> : <Badge color="green">Ouverte</Badge>}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openGradesModal(item)} className="px-3 py-1.5 text-xs font-medium bg-slate-100 rounded-lg hover:bg-slate-200">Saisir</button>
                        <button onClick={() => toggleClose(item)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">{item.period_closed ? <Unlock size={16} /> : <Lock size={16} />}</button>
                        <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {showItemModal && (
        <Modal title="Nouvelle évaluation" onClose={() => setShowItemModal(false)}
          footer={<><button onClick={() => setShowItemModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Annuler</button>
            <button onClick={saveItem} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">{saving ? "..." : "Créer"}</button></>}>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Titre *</label>
              <input value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ex: Examen final" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={itemForm.grade_type} onChange={(e) => setItemForm({ ...itemForm, grade_type: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {["exam","quiz","homework","project","participation","final","rattrapage"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Note max</label>
                <input type="number" value={itemForm.max_score} onChange={(e) => setItemForm({ ...itemForm, max_score: parseFloat(e.target.value) || 20 })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Coefficient</label>
                <input type="number" step="0.5" value={itemForm.weight} onChange={(e) => setItemForm({ ...itemForm, weight: parseFloat(e.target.value) || 1 })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Année académique ID *</label>
              <input value={itemForm.academic_year_id} onChange={(e) => setItemForm({ ...itemForm, academic_year_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="UUID" /></div>
          </div>
        </Modal>
      )}
      {showGradesModal && activeItem && (
        <Modal title={`Notes — ${activeItem.title}`} onClose={() => setShowGradesModal(false)}
          footer={<><button onClick={() => setShowGradesModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Annuler</button>
            <button onClick={saveGrades} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">{saving ? "..." : "Enregistrer"}</button></>}>
          <p className="text-xs text-slate-500 mb-4">Note sur {activeItem.max_score}. Tapez "abs" pour une absence.</p>
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{s.last_name} {s.first_name}</span>
              <input value={gradeValues[s.id] || ""} onChange={(e) => setGradeValues({ ...gradeValues, [s.id]: e.target.value })}
                className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="—" />
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
