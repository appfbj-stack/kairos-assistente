import { Router, Request, Response } from "express";
import { queryAll } from "../database/database.js";
import { requireAuth, requireRole, scopeEmpresaId } from "../core/auth.js";

const router = Router();

// Consulta da trilha de auditoria (PRD seção 16). Restrita a gestores.
router.get(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
    const conditions: string[] = [];
    const params: any[] = [];
    if (empresaId) {
      conditions.push("empresa_id = ?");
      params.push(empresaId);
    }
    if (req.query.action) {
      conditions.push("action ILIKE ?");
      params.push(`%${req.query.action}%`);
    }
    if (req.query.from) {
      conditions.push("created_at >= ?");
      params.push(req.query.from);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await queryAll(`SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT 500`, params);
    res.json(rows);
  }
);

export default router;
