import type postgres from "npm:postgres@3.4.5";

export type Db = postgres.TransactionSql;

export interface Profile {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  fullName: string;
}

export interface Ctx {
  db: Db;
  user: Profile;
  body: any;
  params: Record<string, string>;
  query: URLSearchParams;
}

export interface Result {
  status: number;
  body?: unknown;
}

export type Handler = (ctx: Ctx) => Promise<Result>;

export interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  roles?: string[];
  handler: Handler;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function route(
  method: string,
  path: string,
  handler: Handler,
  roles?: string[],
): Route {
  const keys: string[] = [];
  const source = path.replace(/:([a-zA-Z_]+)/g, (_m, key: string) => {
    keys.push(key);
    return "([^/]+)";
  });
  return { method, pattern: new RegExp(`^${source}$`), keys, roles, handler };
}

export function matchRoute(
  routes: Route[],
  method: string,
  path: string,
): { route: Route; params: Record<string, string> } | null {
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = r.pattern.exec(path);
    if (!m) continue;
    const params: Record<string, string> = {};
    r.keys.forEach((key, i) => (params[key] = decodeURIComponent(m[i + 1])));
    return { route: r, params };
  }
  return null;
}

export const ok = (body: unknown): Result => ({ status: 200, body });
export const created = (body: unknown): Result => ({ status: 201, body });
export const noContent = (): Result => ({ status: 204 });
export const notFound = (message = "Not found"): Result => ({ status: 404, body: { error: message } });
export const forbidden = (message: string): Result => ({ status: 403, body: { error: message } });
