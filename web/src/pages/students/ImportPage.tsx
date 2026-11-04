import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, ErrorBanner } from "@/components/ui";
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";

export default function ImportPage() {
  const [csvText, setCsvText] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [preview, setPreview] = useState<any[] | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseCsv(text: string): any[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim());
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    });
  }

  async function doPreview() {
    setLoading(true); setError(null); setResult(null);
    const rows = parseCsv(csvText);
    try {
      const res = await api.post("/api/students/import/preview", { rows, school_id: schoolId, class_id: classId });
      setPreview(res.results);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function doConfirm() {
    setLoading(true); setError(null);
    const rows = parseCsv(csvText);
    const validRows = rows.filter((_, i) => preview?.[i]?.valid);
    try {
      const res = await api.post("/api/students/import/confirm", { rows: validRows, school_id: schoolId, class_id: classId });
      setResult(res);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader title="Import CSV d'élèves" />
      {error && <ErrorBanner message={error} />}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">ID École *</label>
          <input value={schoolId} onChange={(e) => setSchoolId(e.target.value)} placeholder="UUID" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">ID Classe (optionnel)</label>
          <input value={classId} onChange={(e) => setClassId(e.target.value)} placeholder="UUID" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Données CSV (en-tête: matricule,first_name,last_name,date_of_birth,gender,phone)</label>
          <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8}
            placeholder="matricule,first_name,last_name,date_of_birth,gender,phone&#10;ETU001,Jean,Dupont,2005-03-15,M,0601020304"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono" />
        </div>
        <button onClick={doPreview} disabled={loading || !csvText || !schoolId}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          <Upload size={16} /> Prévisualiser
        </button>
      </div>
      {preview && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h3 className="font-semibold mb-4">Aperçu ({preview.filter((r: any) => r.valid).length}/{preview.length} valides)</h3>
          <div className="space-y-2">
            {preview.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {r.valid ? <CheckCircle className="text-green-600" size={18} /> : <XCircle className="text-red-600" size={18} />}
                <span className="font-medium">{r.row.matricule} — {r.row.first_name} {r.row.last_name}</span>
                {r.errors.length > 0 && <span className="text-red-600 text-xs">{r.errors.join(", ")}</span>}
              </div>
            ))}
          </div>
          <button onClick={doConfirm} disabled={loading || preview.filter((r: any) => r.valid).length === 0}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            <FileSpreadsheet size={16} /> Confirmer l'import ({preview.filter((r: any) => r.valid).length})
          </button>
        </div>
      )}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold mb-2">Résultat</h3>
          <p className="text-sm"><CheckCircle className="inline text-green-600" size={18} /> {result.imported} élève(s) importé(s) sur {result.total}.</p>
          {result.errors?.length > 0 && (
            <div className="mt-2 text-sm text-red-600">
              {result.errors.map((e: any, i: number) => <div key={i}>Ligne {e.row}: {e.error}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
