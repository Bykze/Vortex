const API_URL = import.meta.env.VITE_API_URL || "";

export function getToken(): string | null {
  return localStorage.getItem("vortex_access_token");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("vortex_refresh_token");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("vortex_access_token", access);
  localStorage.setItem("vortex_refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("vortex_access_token");
  localStorage.removeItem("vortex_refresh_token");
}

async function refreshAccessToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem("vortex_access_token", data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getToken();
      if (newToken) headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
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
