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
    "SELECT * FROM barber_services WHERE empresa_id = ? ORDER BY name",
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
    const { name, duration_minutes, price, empresa_id } = req.body;
    if (!name) return res.status(400).json({ error: "name é obrigatório" });

    const empresaId = actor.role === "SUPER_ADMIN" ? empresa_id : actor.empresa_id;
    if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

    const id = crypto.randomUUID();
    await runSql(
      "INSERT INTO barber_services (id, empresa_id, name, duration_minutes, price) VALUES (?, ?, ?, ?, ?)",
      [id, empresaId, name, duration_minutes || 30, price || 0]
    );
    res.status(201).json({ id, empresa_id: empresaId, name, duration_minutes: duration_minutes || 30, price: price || 0 });
  }
);

router.patch(
  "/:id",
  requireCoreAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "GERENTE"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req);
    const existing = await queryOne("SELECT empresa_id FROM barber_services WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: "Serviço não encontrado" });
    if (empresaId && (existing as any).empresa_id !== empresaId) {
      return res.status(403).json({ error: "Sem acesso a este serviço" });
    }

    const { name, duration_minutes, price, active } = req.body;
    await runSql(
      `UPDATE barber_services SET
        name = COALESCE(?, name),
        duration_minutes = COALESCE(?, duration_minutes),
        price = COALESCE(?, price),
        active = COALESCE(?, active),
        updated_at = NOW()
       WHERE id = ?`,
      [name ?? null, duration_minutes ?? null, price ?? null, active ?? null, req.params.id]
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
    const existing = await queryOne("SELECT empresa_id FROM barber_services WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: "Serviço não encontrado" });
    if (empresaId && (existing as any).empresa_id !== empresaId) {
      return res.status(403).json({ error: "Sem acesso a este serviço" });
    }
    await runSql("DELETE FROM barber_services WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  }
);

export default router;
