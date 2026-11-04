import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types";
import {
  LayoutDashboard, Building2, Calendar, GraduationCap, BookOpen, Settings,
  Users, ClipboardList, CheckSquare, UserPlus, TrendingDown, LifeBuoy,
  Award, CalendarCheck, User, LogOut, Menu, X, CreditCard, Shield,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  path: string; label: string; icon: LucideIcon; roles: UserRole[];
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: "Principal",
    items: [
      { path: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ["super_admin","direction","staff","teacher","student","guardian"] },
      { path: "/profile", label: "Mon profil", icon: User, roles: ["super_admin","direction","staff","teacher","student","guardian"] },
    ],
  },
  {
    title: "Gouvernance",
    items: [
      { path: "/admin/schools", label: "Écoles", icon: Building2, roles: ["super_admin","direction","staff"] },
      { path: "/admin/years", label: "Années académiques", icon: Calendar, roles: ["super_admin","direction","staff"] },
      { path: "/admin/classes", label: "Classes", icon: GraduationCap, roles: ["super_admin","direction","staff"] },
      { path: "/admin/subjects", label: "Matières", icon: BookOpen, roles: ["super_admin","direction","staff"] },
      { path: "/admin/rules", label: "Règles de progression", icon: Settings, roles: ["super_admin","direction"] },
    ],
  },
  {
    title: "SaaS",
    items: [
      { path: "/admin/tenants", label: "Tenants", icon: Shield, roles: ["super_admin"] },
      { path: "/admin/payments", label: "Paiements", icon: CreditCard, roles: ["super_admin"] },
      { path: "/admin/settings", label: "Paramètres", icon: Settings, roles: ["super_admin"] },
    ],
  },
  {
    title: "Enseignement",
    items: [
      { path: "/teachers/grades", label: "Carnet de notes", icon: ClipboardList, roles: ["super_admin","direction","staff","teacher"] },
      { path: "/teachers/attendance", label: "Présences", icon: CheckSquare, roles: ["super_admin","direction","staff","teacher"] },
      { path: "/teachers/enrollments", label: "Inscriptions", icon: UserPlus, roles: ["super_admin","direction","staff","teacher"] },
    ],
  },
  {
    title: "Registre",
    items: [
      { path: "/students", label: "Élèves", icon: Users, roles: ["super_admin","direction","staff","teacher"] },
      { path: "/students/import", label: "Import CSV", icon: UserPlus, roles: ["super_admin","direction","staff"] },
    ],
  },
  {
    title: "Suivi",
    items: [
      { path: "/monitoring/risk", label: "Système d'alerte", icon: TrendingDown, roles: ["super_admin","direction","staff","teacher"] },
      { path: "/monitoring/interventions", label: "Interventions", icon: LifeBuoy, roles: ["super_admin","direction","staff","teacher"] },
      { path: "/monitoring/audit", label: "Journal d'audit", icon: Shield, roles: ["super_admin","direction"] },
    ],
  },
  {
    title: "Mon Espace",
    items: [
      { path: "/my/grades", label: "Mes notes", icon: Award, roles: ["student"] },
      { path: "/my/attendance", label: "Mes présences", icon: CalendarCheck, roles: ["student"] },
    ],
  },
];

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin", direction: "Direction", staff: "Personnel",
  teacher: "Enseignant", student: "Élève", guardian: "Tuteur",
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const filtered = sections
    .map((s) => ({ ...s, items: s.items.filter((i) => i.roles.includes(user.role)) }))
    .filter((s) => s.items.length > 0);

  const initials = user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-slate-300 flex flex-col z-50 transition-transform ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center gap-3 p-5 border-b border-slate-800">
          <img src="/vortex.svg" alt="Vortex" className="w-8 h-8" />
          <div><div className="font-bold text-white text-sm">Vortex</div><div className="text-xs text-slate-400">School Management</div></div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {filtered.map((s) => (
            <div key={s.title} className="mb-4">
              <div className="text-xs uppercase tracking-wider text-slate-500 px-3 py-2 font-semibold">{s.title}</div>
              {s.items.map((item) => (
                <NavLink key={item.path} to={item.path} onClick={() => setOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors ${isActive ? "bg-primary-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                  <item.icon size={18} /> {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user.fullName}</div>
              <div className="text-xs text-slate-400">{roleLabels[user.role]}</div>
            </div>
            <button onClick={() => { logout(); navigate("/login"); }} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"><LogOut size={18} /></button>
          </div>
        </div>
      </aside>

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="text-lg font-semibold text-slate-800 hidden md:block">Vortex School Management</h1>
        </header>
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
