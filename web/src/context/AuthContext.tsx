import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setTokens, clearTokens, getToken } from "@/lib/api";
import type { AuthUser } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, fullName: string, tenantName: string, tenantSlug: string) => Promise<{ error: string | null }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    // Decode JWT to get user info
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({
        id: payload.userId, email: payload.email,
        fullName: payload.fullName || payload.email,
        role: payload.role, tenantId: payload.tenantId,
      });
    } catch { clearTokens(); }
    setLoading(false);
  }, []);

  async function login(email: string, password: string, tenantSlug?: string) {
    try {
      const data = await api.post("/api/auth/login", { email, password, tenantSlug });
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  async function signup(email: string, password: string, fullName: string, tenantName: string, tenantSlug: string) {
    try {
      const data = await api.post("/api/auth/signup", { email, password, fullName, tenantName, tenantSlug });
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  function logout() {
    clearTokens();
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
