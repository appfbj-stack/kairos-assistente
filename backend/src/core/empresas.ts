import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, requireRole, scopeEmpresaId } from "./auth.js";
import type { AuthUser } from "./types.js";

const router = Router();

const DIACRITICS = /[\u0300-\u036f]/g;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// SUPER_ADMIN cria empresas
router.post("/", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { name, document } = req.body;
  if (!name) return res.status(400).json({ error: "name é obrigatório" });

  const user = (req as any).user as AuthUser;
  const id = crypto.randomUUID();
  const slug = slugify(name) + "-" + id.slice(0, 6);

  await runSql(
    "INSERT INTO empresas (id, name, slug, document, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)",
    [id, name, slug, document || "", user.id, user.id]
  );

  res.status(201).json({ id, name, slug });
});

router.get("/", requireCoreAuth, async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  if (user.role === "SUPER_ADMIN") {
    const rows = await queryAll("SELECT * FROM empresas WHERE deleted_at IS NULL ORDER BY created_at DESC");
    return res.json(rows);
  }
  const row = await queryOne("SELECT * FROM empresas WHERE id = ? AND deleted_at IS NULL", [user.empresa_id]);
  res.json(row ? [row] : []);
});

router.get("/:id", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.id));
  if (empresaId !== req.params.id) return res.status(403).json({ error: "Sem acesso a esta empresa" });
  const row = await queryOne("SELECT * FROM empresas WHERE id = ? AND deleted_at IS NULL", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Empresa não encontrada" });
  res.json(row);
});

// Bloquear/liberar empresa (SUPER_ADMIN)
router.post("/:id/block", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  await runSql("UPDATE empresas SET active = FALSE, updated_at = NOW() WHERE id = ?", [req.params.id]);
  res.json({ ok: true, active: false });
});

router.post("/:id/unblock", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  await runSql("UPDATE empresas SET active = TRUE, updated_at = NOW() WHERE id = ?", [req.params.id]);
  res.json({ ok: true, active: true });
});

// Exclusão lógica (SUPER_ADMIN) — nunca exclusão física
router.delete("/:id", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  await runSql("UPDATE empresas SET deleted_at = NOW(), active = FALSE WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

export default router;
