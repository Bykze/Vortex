import jwt from "jsonwebtoken";
import type { FastifyRequest, FastifyReply } from "fastify";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev_secret_change_me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh_change_me";
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "7d";

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return (jwt.sign as any)(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefreshToken(payload: JwtPayload): string {
  return (jwt.sign as any)(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

export async function authMiddleware(req: FastifyRequest, _reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw { statusCode: 401, message: "Missing or invalid Authorization header" };
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    (req as any).user = payload;
  } catch {
    throw { statusCode: 401, message: "Invalid or expired token" };
  }
}

export function requireRole(...roles: string[]) {
  return (req: FastifyRequest, _reply: FastifyReply) => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user) throw { statusCode: 401, message: "Not authenticated" };
    if (!roles.includes(user.role)) {
      throw { statusCode: 403, message: "Insufficient permissions" };
    }
  };
}
