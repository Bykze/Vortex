import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    const { error } = await signup(email, password, fullName, tenantName, tenantSlug);
    setLoading(false);
    if (error) setError(error); else navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-primary-900 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/vortex.svg" alt="Vortex" className="w-12 h-12" />
          <h1 className="text-2xl font-bold text-slate-900">Vortex</h1>
        </div>
        <h2 className="text-center text-lg text-slate-600 mb-6">Créer votre école</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'école *</label>
            <input type="text" required value={tenantName} onChange={(e) => setTenantName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Lycée Victor Hugo" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Slug (identifiant) *</label>
            <input type="text" required value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="victor-hugo" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Votre nom complet *</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Jean Dupont" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="vous@ecole.fr" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe *</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="••••••••" /></div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50">
            {loading ? "Création..." : "Créer mon école"}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-6"><Link to="/login" className="text-primary-600 font-medium">Se connecter</Link></p>
      </div>
    </div>
  );
}
