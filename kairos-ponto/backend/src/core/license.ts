import { Router, Request, Response } from "express";
import { queryOne } from "../database/database.js";
import { requireAuth, scopeEmpresaId } from "./auth.js";

/**
 * Integração com o licenciamento CENTRALIZADO do Kairos Admin (PRD seção 21).
 * O Kairos Ponto tem banco próprio, mas a licença de cada empresa é verificada
 * no hub central via o contrato público GET /api/license/verify.
 */
const KAIROS_ADMIN_URL = process.env.KAIROS_ADMIN_URL || "http://kairos-backend:3010";
const APP_SLUG = process.env.KAIROS_APP_SLUG || "kairos-ponto";
const FAIL_OPEN = (process.env.LICENSE_FAIL_OPEN || "true") === "true";

export interface LicenseResult {
  valid: boolean;
  status: string;
  days_remaining?: number;
  client_name?: string;
  message?: string;
}

export async function verifyLicense(clientId: string | null | undefined): Promise<LicenseResult> {
  const cid = clientId || process.env.KAIROS_CLIENT_ID || "";
  if (!cid) {
    // Sem client_id configurado: não há o que verificar no hub.
    return { valid: FAIL_OPEN, status: "unconfigured", message: "Sem KAIROS_CLIENT_ID configurado" };
  }
  const url = `${KAIROS_ADMIN_URL}/api/license/verify?client_id=${encodeURIComponent(cid)}&app_slug=${encodeURIComponent(APP_SLUG)}`;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    const data = (await res.json()) as any;
    // O Kairos Admin retorna `valid` (e às vezes `active`); normalizamos.
    return {
      valid: Boolean(data.valid ?? data.active),
      status: data.status || "unknown",
      days_remaining: data.days_remaining,
      client_name: data.client_name,
      message: data.message,
    };
  } catch {
    // Hub inacessível → fail-open/closed conforme configuração (PRD: alta disponibilidade).
    return {
      valid: FAIL_OPEN,
      status: "unreachable",
      message: "Kairos Admin inacessível — verificação de licença ignorada (fail-open)",
    };
  }
}

/** Middleware: bloqueia a empresa se a licença no Kairos Admin estiver inválida. */
export async function enforceLicense(req: Request, res: Response, next: Function) {
  const empresaId = scopeEmpresaId(req);
  if (!empresaId) return next(); // SUPER_ADMIN sem empresa específica
  const empresa = await queryOne("SELECT kairos_client_id FROM empresas WHERE id = ?", [empresaId]);
  const result = await verifyLicense(empresa?.kairos_client_id);
  if (!result.valid) {
    return res.status(403).json({ error: result.message || "Licença inválida ou expirada", license: result });
  }
  next();
}

const router = Router();

// Permite ao painel consultar o status da licença da própria empresa.
router.get("/status", requireAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  if (!empresaId) return res.json({ valid: true, status: "platform", message: "SUPER_ADMIN" });
  const empresa = await queryOne("SELECT kairos_client_id FROM empresas WHERE id = ?", [empresaId]);
  const result = await verifyLicense(empresa?.kairos_client_id);
  res.json(result);
});

export default router;
