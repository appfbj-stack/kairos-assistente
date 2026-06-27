import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { AuthUser, PontoRole } from "./types.js";

const JWT_SECRET = process.env.PONTO_JWT_SECRET || "kairos-ponto-dev-secret-change-me";
const JWT_EXPIRES_IN = "12h";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAuthToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token de autenticação necessário" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

export function requireRole(...roles: PontoRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) return res.status(401).json({ error: "Não autenticado" });
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Permissão insuficiente para esta ação" });
    }
    next();
  };
}

/**
 * Garante o isolamento multiempresa: só o SUPER_ADMIN enxerga dados de qualquer
 * empresa; os demais papéis ficam restritos à própria empresa (PRD seção 4).
 */
export function scopeEmpresaId(req: Request, requestedEmpresaId?: string | null): string | null {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return requestedEmpresaId ?? null;
  if (user.role === "SUPER_ADMIN") return requestedEmpresaId ?? null;
  return user.empresa_id;
}
