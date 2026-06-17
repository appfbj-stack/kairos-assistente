import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, requireRole, scopeEmpresaId } from "./auth.js";

const router = Router();

// Catálogo de módulos (CRM, Agenda, Financeiro, etc.) — gerenciado pelo SUPER_ADMIN
router.post("/", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { name, slug } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "name e slug são obrigatórios" });

  const id = crypto.randomUUID();
  await runSql("INSERT INTO modules (id, name, slug) VALUES (?, ?, ?)", [id, name, slug]);
  res.status(201).json({ id, name, slug });
});

router.get("/", requireCoreAuth, async (_req: Request, res: Response) => {
  const rows = await queryAll("SELECT * FROM modules ORDER BY name");
  res.json(rows);
});

router.patch("/:id", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { active } = req.body;
  await runSql("UPDATE modules SET active = ?, updated_at = NOW() WHERE id = ?", [!!active, req.params.id]);
  res.json({ ok: true });
});

// Quais módulos uma empresa tem habilitados
router.get("/empresas/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const rows = await queryAll(
    `SELECT m.id, m.name, m.slug, COALESCE(cm.active, FALSE) as active
     FROM modules m
     LEFT JOIN company_modules cm ON cm.module_id = m.id AND cm.empresa_id = ?
     WHERE m.active = TRUE
     ORDER BY m.name`,
    [req.params.empresaId]
  );
  res.json(rows);
});

// Habilitar/desabilitar módulo para uma empresa (SUPER_ADMIN)
router.post(
  "/empresas/:empresaId/:moduleId",
  requireCoreAuth,
  requireRole("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const { empresaId, moduleId } = req.params;
    const { active } = req.body;

    const existing = await queryOne(
      "SELECT 1 FROM company_modules WHERE empresa_id = ? AND module_id = ?",
      [empresaId, moduleId]
    );
    if (existing) {
      await runSql(
        "UPDATE company_modules SET active = ?, updated_at = NOW() WHERE empresa_id = ? AND module_id = ?",
        [!!active, empresaId, moduleId]
      );
    } else {
      await runSql(
        "INSERT INTO company_modules (empresa_id, module_id, active) VALUES (?, ?, ?)",
        [empresaId, moduleId, !!active]
      );
    }
    res.json({ ok: true, empresa_id: empresaId, module_id: moduleId, active: !!active });
  }
);

export default router;
