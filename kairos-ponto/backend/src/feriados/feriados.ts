import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, runSql } from "../database/database.js";
import { requireAuth, requireRole, scopeEmpresaId } from "../core/auth.js";

const router = Router();

// Feriados da empresa (usados na apuração de horas extras — PRD seção 12).
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });
  const rows = await queryAll("SELECT * FROM feriados WHERE empresa_id = ? ORDER BY data", [empresaId]);
  res.json(rows);
});

router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req, req.body.empresa_id);
    const { data, descricao } = req.body;
    if (!empresaId || !data) return res.status(400).json({ error: "empresa_id e data são obrigatórios" });
    const id = crypto.randomUUID();
    await runSql(
      "INSERT INTO feriados (id, empresa_id, data, descricao) VALUES (?, ?, ?, ?) ON CONFLICT (empresa_id, data) DO UPDATE SET descricao = EXCLUDED.descricao",
      [id, empresaId, data, descricao || ""]
    );
    res.status(201).json({ id, data, descricao });
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA"),
  async (req: Request, res: Response) => {
    await runSql("DELETE FROM feriados WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  }
);

export default router;
