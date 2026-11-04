import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Spinner, ErrorBanner } from "@/components/ui";
import type { TenantSettings } from "@/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ school_name: "", ai_enabled: false, max_students: 500, max_teachers: 50, locale: "fr" });

  useEffect(() => {
    api.get("/api/tenant-settings").then((d) => {
      setSettings(d);
      setForm({ school_name: d.school_name || "", ai_enabled: d.ai_enabled, max_students: d.max_students, max_teachers: d.max_teachers, locale: d.locale });
      setLoading(false);
    }).catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  async function handleSave() {
    setSaving(true); setError(null);
    try { await api.put("/api/tenant-settings", form); setSettings({ ...settings!, ...form }); }
    catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Paramètres" />
      {error && <ErrorBanner message={error} />}
      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'école</label>
          <input value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Max élèves</label>
            <input type="number" value={form.max_students} onChange={(e) => setForm({ ...form, max_students: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Max enseignants</label>
            <input type="number" value={form.max_teachers} onChange={(e) => setForm({ ...form, max_teachers: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Langue</label>
          <select value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="fr">Français</option><option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.ai_enabled} onChange={(e) => setForm({ ...form, ai_enabled: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm font-medium text-slate-700">Activer les fonctionnalités IA (désactivé par défaut)</span>
          </label>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
