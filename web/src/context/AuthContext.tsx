import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { AuthUser } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, fullName: string, tenantName: string, tenantSlug: string) => Promise<{ error: string | null }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function translateAuthError(message: string) {
  if (message.includes("Invalid login credentials")) return "Email ou mot de passe incorrect";
  if (message.includes("already registered")) return "Un compte existe déjà avec cet email";
  if (message.includes("Password should be at least")) return "Le mot de passe doit contenir au moins 6 caractères";
  return message;
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    return await api.get<AuthUser>("/api/auth/me");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const me = await fetchCurrentUser();
      if (active) setUser(me);
    }).finally(() => { if (active) setLoading(false); });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setUser(null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: translateAuthError(error.message) };
    const me = await fetchCurrentUser();
    if (!me) {
      await supabase.auth.signOut();
      return { error: "Ce compte n'est rattaché à aucune école" };
    }
    setUser(me);
    return { error: null };
  }

  async function signup(email: string, password: string, fullName: string, tenantName: string, tenantSlug: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: translateAuthError(error.message) };
    if (!data.session) {
      return { error: "Inscription impossible sans connexion : désactivez la confirmation par email dans Supabase" };
    }
    try {
      await api.post("/api/auth/signup", { tenantName, tenantSlug, fullName });
    } catch (err: any) {
      await supabase.auth.signOut();
      return { error: err.message };
    }
    const me = await fetchCurrentUser();
    if (!me) return { error: "Impossible de charger votre compte" };
    setUser(me);
    return { error: null };
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
