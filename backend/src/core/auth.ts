import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { AuthUser, CoreRole } from "./types.js";

const JWT_SECRET = process.env.CORE_JWT_SECRET || "kairos-core-dev-secret-change-me";
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

export function requireCoreAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";

  // JWT Bearer token
  if (header.startsWith("Bearer ")) {
    const token = header.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      (req as any).user = decoded;
      return next();
    } catch {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }
  }

  // Fallback: Basic Auth (mesmo credentials do Admin)
  if (header.startsWith("Basic ")) {
    const basicUser = process.env.BASIC_AUTH_USER;
    const basicPass = process.env.BASIC_AUTH_PASSWORD;
    const expected = Buffer.from(`${basicUser}:${basicPass}`).toString("base64");
    if (header.slice(6).trim() === expected) {
      (req as any).user = {
        id: "basic-auth-user",
        email: basicUser,
        role: "SUPER_ADMIN" as CoreRole,
        empresa_id: null,
      } as AuthUser;
      return next();
    }
  }

  return res.status(401).json({ error: "Token de autenticação necessário" });
}

export function requireRole(...roles: CoreRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) return res.status(401).json({ error: "Não autenticado" });
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Permissão insuficiente para esta ação" });
    }
    next();
  };
}

/** Garante que ADMIN_EMPRESA e papéis abaixo só vejam dados da própria empresa. */
export function scopeEmpresaId(req: Request, requestedEmpresaId?: string | null): string | null {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return requestedEmpresaId ?? null;
  if (user.role === "SUPER_ADMIN") return requestedEmpresaId ?? null;
  return user.empresa_id;
}
