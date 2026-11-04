import jwt from "jsonwebtoken";
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev_secret_change_me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh_change_me";
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "7d";
export function signAccessToken(payload) {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}
export function signRefreshToken(payload) {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}
export function verifyAccessToken(token) {
    return jwt.verify(token, ACCESS_SECRET);
}
export function verifyRefreshToken(token) {
    return jwt.verify(token, REFRESH_SECRET);
}
export async function authMiddleware(req, _reply) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw { statusCode: 401, message: "Missing or invalid Authorization header" };
    }
    const token = authHeader.slice(7);
    try {
        const payload = verifyAccessToken(token);
        req.user = payload;
    }
    catch {
        throw { statusCode: 401, message: "Invalid or expired token" };
    }
}
export function requireRole(...roles) {
    return (req, _reply) => {
        const user = req.user;
        if (!user)
            throw { statusCode: 401, message: "Not authenticated" };
        if (!roles.includes(user.role)) {
            throw { statusCode: 403, message: "Insufficient permissions" };
        }
    };
}
//# sourceMappingURL=auth.js.map