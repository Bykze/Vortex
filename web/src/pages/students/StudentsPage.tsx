import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Spinner, ErrorBanner, EmptyState, Modal, Badge } from "@/components/ui";
import { Plus, Pencil, Eye, Search } from "lucide-react";
import type { Student } from "@/types";

const statusMap: Record<string, { label: string; color: string }> = {
  pre_admission: { label: "Pré-admission", color: "blue" },
  orientation: { label: "Orientation", color: "yellow" },
  active: { label: "Actif", color: "green" },
  special_status: { label: "Statut spécial", color: "yellow" },
  graduated: { label: "Diplômé", color: "blue" },
  transferred: { label: "Transféré", color: "gray" },
  expelled: { label: "Expulsé", color: "red" },
};

export default function StudentsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ school_id: "", matricule: "", first_name: "", last_name: "", date_of_birth: "", gender: "M", phone: "", status: "pre_admission" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/api/students").then((d) => { setItems(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  async function create() {
    setSaving(true); setError(null);
    try { await api.post("/api/students", form); setShowModal(false); const d = await api.get("/api/students"); setItems(d); }
    catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  const filtered = items.filter((s) => {
    const ms = !search || `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) || s.matricule.toLowerCase().includes(search.toLowerCase());
    const mst = filterStatus === "all" || s.status === filterStatus;
    return ms && mst;
  });

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Registre des élèves" action={
        <button onClick={() => { setForm({ school_id: "", matricule: `ETU-${Date.now().toString().slice(-6)}`, first_name: "", last_name: "", date_of_birth: "", gender: "M", phone: "", status: "pre_admission" }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
          <Plus size={16} /> Nouvel élève
        </button>
      } />
      {error && <ErrorBanner message={error} />}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom ou matricule..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="all">Tous les statuts</option>
          {Object.entries(statusMap).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? <EmptyState title="Aucun élève" message="Ajoutez des élèves." /> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Matricule</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Nom</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-slate-500">Statut</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-slate-500">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/students/${s.id}`)}>
                  <td className="px-4 py-3 text-sm">{s.matricule}</td>
                  <td className="px-4 py-3 font-semibold text-sm">{s.last_name} {s.first_name}</td>
                  <td className="px-4 py-3"><Badge color={statusMap[s.status]?.color || "gray"}>{statusMap[s.status]?.label || s.status}</Badge></td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => navigate(`/students/${s.id}`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><Eye size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <Modal title="Nouvel élève" onClose={() => setShowModal(false)}
          footer={<><button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Annuler</button>
            <button onClick={create} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">{saving ? "..." : "Enregistrer"}</button></>}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Prénom *</label><input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label><input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Matricule *</label><input value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Date de naissance</label><input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">École ID *</label><input value={form.school_id} onChange={(e) => setForm({ ...form, school_id: e.target.value })} placeholder="UUID" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Sexe</label><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"><option value="M">M</option><option value="F">F</option><option value="other">Autre</option></select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Statut</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">{Object.entries(statusMap).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
