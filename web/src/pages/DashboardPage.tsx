import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { DashboardStats } from "@/types";
import { Spinner } from "@/components/ui";
import { Users, GraduationCap, BookOpen, TrendingDown, LifeBuoy, Building2, Calendar, AlertTriangle } from "lucide-react";
import type { UserRole } from "@/types";

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Administrateur", direction: "Direction", staff: "Personnel administratif",
  teacher: "Enseignant", student: "Élève", guardian: "Tuteur",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "student") { setLoading(false); return; }
    api.get("/api/dashboard").then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  if (loading) return <Spinner />;
  if (!user) return null;

  const cards: { icon: any; label: string; value: number; color: string }[] = [];
  if (stats.students != null) cards.push({ icon: Users, label: "Élèves", value: stats.students, color: "bg-blue-100" });
  if (stats.teachers != null) cards.push({ icon: GraduationCap, label: "Enseignants", value: stats.teachers, color: "bg-amber-100" });
  if (stats.classes != null) cards.push({ icon: Building2, label: "Classes", value: stats.classes, color: "bg-teal-100" });
  if (stats.subjects != null) cards.push({ icon: BookOpen, label: "Matières", value: stats.subjects, color: "bg-blue-100" });
  if (stats.atRisk != null) cards.push({ icon: TrendingDown, label: "Élèves à risque", value: stats.atRisk, color: "bg-red-100" });
  if (stats.activeInterventions != null) cards.push({ icon: LifeBuoy, label: "Interventions actives", value: stats.activeInterventions, color: "bg-orange-100" });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Bienvenue, {user.fullName}</h1>
        <p className="text-slate-500 text-sm">{roleLabels[user.role]} — Voici un aperçu de votre plateforme.</p>
      </div>
      {cards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {cards.map((c, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className={`w-13 h-13 rounded-xl ${c.color} flex items-center justify-center flex-shrink-0`}><c.icon size={24} /></div>
              <div><div className="text-2xl font-bold text-slate-900">{c.value}</div><div className="text-sm text-slate-500">{c.label}</div></div>
            </div>
          ))}
        </div>
      )}
      {stats.atRisk != null && stats.atRisk > 0 && (
        <div className="bg-white rounded-xl border-l-4 border-amber-500 border border-slate-200 p-5 flex items-center gap-4 mb-6">
          <AlertTriangle className="text-amber-600" size={24} />
          <div><h3 className="font-semibold text-slate-800">Alerte — Élèves à risque</h3>
            <p className="text-sm text-slate-600">{stats.atRisk} élève(s) ont un risque élevé ou critique. Consultez le système d'alerte.</p></div>
        </div>
      )}
      {user.role === "student" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-lg mb-2">Mon parcours académique</h3>
          <p className="text-sm text-slate-600">Consultez vos notes et présences via le menu « Mon Espace ».</p>
        </div>
      )}
    </div>
  );
}
