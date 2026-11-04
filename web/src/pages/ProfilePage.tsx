import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/ui";
import { User, Mail, Shield } from "lucide-react";

const roleLabels: Record<string, string> = {
  super_admin: "Super Administrateur", direction: "Direction", staff: "Personnel",
  teacher: "Enseignant", student: "Élève", guardian: "Tuteur",
};

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  const initials = user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div>
      <PageHeader title="Mon profil" />
      <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-2xl">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">{initials}</div>
          <div><h2 className="text-xl font-bold">{user.fullName}</h2><p className="text-slate-500 text-sm">{roleLabels[user.role]}</p></div>
        </div>
        <div className="space-y-4 border-t border-slate-200 pt-6">
          <div className="flex items-center gap-3"><Mail size={20} className="text-slate-400" /><div><div className="text-xs text-slate-500">Email</div><div className="text-sm font-medium">{user.email}</div></div></div>
          <div className="flex items-center gap-3"><Shield size={20} className="text-slate-400" /><div><div className="text-xs text-slate-500">Rôle</div><div className="text-sm font-medium">{roleLabels[user.role]}</div></div></div>
          <div className="flex items-center gap-3"><User size={20} className="text-slate-400" /><div><div className="text-xs text-slate-500">ID Locataire</div><div className="text-sm font-mono text-xs">{user.tenantId}</div></div></div>
        </div>
      </div>
    </div>
  );
}
