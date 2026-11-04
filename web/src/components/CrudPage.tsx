import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { PageHeader, Spinner, ErrorBanner, EmptyState, Modal, Badge } from "@/components/ui";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export interface Column {
  key: string; label: string; render?: (row: any) => React.ReactNode;
}

export interface FieldDef {
  name: string; label: string; type?: "text" | "number" | "date" | "select" | "textarea";
  options?: { value: string; label: string }[]; required?: boolean; default?: any;
}

export default function CrudPage({
  title, apiPath, columns, fields, canCreate = true,
}: {
  title: string; apiPath: string; columns: Column[]; fields: FieldDef[]; canCreate?: boolean;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await api.get(apiPath); setItems(data); }
    catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [apiPath]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    const defaults: Record<string, any> = {};
    fields.forEach((f) => { defaults[f.name] = f.default ?? (f.type === "number" ? 0 : ""); });
    setForm(defaults); setShowModal(true);
  }

  function openEdit(item: any) {
    setEditing(item);
    const vals: Record<string, any> = {};
    fields.forEach((f) => { vals[f.name] = item[f.name] ?? f.default ?? ""; });
    setForm(vals); setShowModal(true);
  }

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      if (editing) { await api.put(`${apiPath}/${editing.id}`, form); }
      else { await api.post(apiPath, form); }
      setShowModal(false); load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet élément ?")) return;
    try { await api.del(`${apiPath}/${id}`); load(); }
    catch (e: any) { setError(e.message); }
  }

  const filtered = search ? items.filter((item) =>
    columns.some((c) => String(item[c.key] || "").toLowerCase().includes(search.toLowerCase()))
  ) : items;

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title={title} action={canCreate ? (
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
          <Plus size={16} /> Ajouter
        </button>
      ) : undefined} />
      {error && <ErrorBanner message={error} />}
      <div className="bg-white rounded-xl border border-slate-200 mb-4 p-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200"><EmptyState title="Aucune donnée" message="Ajoutez votre premier élément." /></div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-200">
              {columns.map((c) => <th key={c.key} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{c.label}</th>)}
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  {columns.map((c) => <td key={c.key} className="px-4 py-3 text-sm text-slate-700">{c.render ? c.render(item) : item[c.key] ?? "—"}</td>)}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <Modal title={editing ? "Modifier" : "Ajouter"} onClose={() => setShowModal(false)}
          footer={<>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">{saving ? "..." : "Enregistrer"}</button>
          </>}>
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}{f.required && " *"}</label>
                {f.type === "select" ? (
                  <select value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">— Choisir —</option>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]" />
                ) : (
                  <input type={f.type || "text"} value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [f.name]: f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
