import crypto from "crypto";
import type { Request } from "express";
import { runSql } from "../database/database.js";
import type { AuthUser } from "./types.js";

/**
 * Auditoria padrão Kairos (PRD seção 16): todo evento relevante registra
 * usuário, data/hora, IP e dispositivo. Nunca lança — auditoria não pode
 * derrubar a operação principal.
 */
export async function audit(
  req: Request,
  action: string,
  opts: { entity?: string; entityId?: string | string[]; details?: string; empresaId?: string | null } = {}
): Promise<void> {
  try {
    const user = (req as any).user as AuthUser | undefined;
    await runSql(
      `INSERT INTO audit_log (id, empresa_id, user_id, action, entity, entity_id, details, ip, dispositivo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        opts.empresaId ?? user?.empresa_id ?? null,
        user?.id ?? null,
        action,
        opts.entity ?? null,
        Array.isArray(opts.entityId) ? opts.entityId[0] : opts.entityId ?? null,
        opts.details ?? "",
        getIp(req),
        String(req.headers["user-agent"] || ""),
      ]
    );
  } catch (err: any) {
    console.error("Falha ao gravar auditoria:", err.message);
  }
}

export function getIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "";
}
