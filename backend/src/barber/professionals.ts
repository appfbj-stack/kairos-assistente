import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, requireRole, scopeEmpresaId } from "../core/auth.js";
import type { AuthUser } from "../core/types.js";

const router = Router();

router.get("/", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

  const rows = await queryAll(
    "SELECT * FROM barber_professionals WHERE empresa_id = ? ORDER BY name",
    [empresaId]
  );
  res.json(rows);
});

router.post(
  "/",
  requireCoreAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "GERENTE"),
  async (req: Request, res: Response) => {
    const actor = (req as any).user as AuthUser;
    const { name, phone, user_id, working_days, working_start, working_end, empresa_id } = req.body;
    if (!name) return res.status(400).json({ error: "name é obrigatório" });

    const empresaId = actor.role === "SUPER_ADMIN" ? empresa_id : actor.empresa_id;
    if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

    const id = crypto.randomUUID();
    await runSql(
      `INSERT INTO barber_professionals
        (id, empresa_id, user_id, name, phone, working_days, working_start, working_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empresaId,
        user_id || null,
        name,
        phone || "",
        working_days || "1,2,3,4,5,6",
        working_start || "09:00",
        working_end || "19:00",
      ]
    );
    res.status(201).json({ id, empresa_id: empresaId, name });
  }
);

router.patch(
  "/:id",
  requireCoreAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "GERENTE"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req);
    const existing = await queryOne("SELECT empresa_id FROM barber_professionals WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: "Profissional não encontrado" });
    if (empresaId && (existing as any).empresa_id !== empresaId) {
      return res.status(403).json({ error: "Sem acesso a este profissional" });
    }

    const { name, phone, working_days, working_start, working_end, active } = req.body;
    await runSql(
      `UPDATE barber_professionals SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        working_days = COALESCE(?, working_days),
        working_start = COALESCE(?, working_start),
        working_end = COALESCE(?, working_end),
        active = COALESCE(?, active),
        updated_at = NOW()
       WHERE id = ?`,
      [
        name ?? null,
        phone ?? null,
        working_days ?? null,
        working_start ?? null,
        working_end ?? null,
        active ?? null,
        req.params.id,
      ]
    );
    res.json({ ok: true });
  }
);

router.delete(
  "/:id",
  requireCoreAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "GERENTE"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req);
    const existing = await queryOne("SELECT empresa_id FROM barber_professionals WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: "Profissional não encontrado" });
    if (empresaId && (existing as any).empresa_id !== empresaId) {
      return res.status(403).json({ error: "Sem acesso a este profissional" });
    }
    await runSql("DELETE FROM barber_professionals WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  }
);

export default router;
