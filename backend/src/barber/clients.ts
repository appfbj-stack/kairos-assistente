import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, requireRole, scopeEmpresaId } from "../core/auth.js";
import type { AuthUser } from "../core/types.js";

const router = Router();

router.get("/", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

  const search = (req.query.search as string | undefined) || "";
  const rows = await queryAll(
    "SELECT * FROM barber_clients WHERE empresa_id = ? AND (name ILIKE ? OR phone ILIKE ?) ORDER BY name",
    [empresaId, `%${search}%`, `%${search}%`]
  );
  res.json(rows);
});

router.post(
  "/",
  requireCoreAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "GERENTE", "ATENDENTE", "PROFISSIONAL"),
  async (req: Request, res: Response) => {
    const actor = (req as any).user as AuthUser;
    const { name, phone, email, notes, empresa_id } = req.body;
    if (!name || !phone) return res.status(400).json({ error: "name e phone são obrigatórios" });

    const empresaId = actor.role === "SUPER_ADMIN" ? empresa_id : actor.empresa_id;
    if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

    const existing = await queryOne("SELECT id FROM barber_clients WHERE empresa_id = ? AND phone = ?", [
      empresaId,
      phone,
    ]);
    if (existing) return res.status(409).json({ error: "Cliente com este telefone já cadastrado" });

    const id = crypto.randomUUID();
    await runSql(
      "INSERT INTO barber_clients (id, empresa_id, name, phone, email, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [id, empresaId, name, phone, email || "", notes || ""]
    );
    res.status(201).json({ id, empresa_id: empresaId, name, phone });
  }
);

router.patch(
  "/:id",
  requireCoreAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "GERENTE", "ATENDENTE", "PROFISSIONAL"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req);
    const existing = await queryOne("SELECT empresa_id FROM barber_clients WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: "Cliente não encontrado" });
    if (empresaId && (existing as any).empresa_id !== empresaId) {
      return res.status(403).json({ error: "Sem acesso a este cliente" });
    }

    const { name, phone, email, notes } = req.body;
    await runSql(
      `UPDATE barber_clients SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        notes = COALESCE(?, notes),
        updated_at = NOW()
       WHERE id = ?`,
      [name ?? null, phone ?? null, email ?? null, notes ?? null, req.params.id]
    );
    res.json({ ok: true });
  }
);

export default router;
