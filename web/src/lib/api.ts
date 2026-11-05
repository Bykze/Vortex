import { supabase } from "@/lib/supabase";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${FUNCTIONS_URL}${path.replace(/^\/api/, "")}`, { ...options, headers });

  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try { const e = await res.json(); msg = e.error || msg; } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path),
  post: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body || {}) }),
  put: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body || {}) }),
  del: <T = any>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
