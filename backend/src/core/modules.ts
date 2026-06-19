import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, requireRole, scopeEmpresaId } from "./auth.js";

const router = Router();

// ─── Catálogo de módulos ────────────────────────────────────────────────

router.post("/", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { name, slug, category, description, icon, tier } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "name e slug são obrigatórios" });

  const id = crypto.randomUUID();
  await runSql(
    "INSERT INTO modules (id, name, slug, category, description, icon, tier) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, name, slug, category || "geral", description || "", icon || "", tier || "pro"]
  );
  res.status(201).json({ id, name, slug, category, description, icon, tier });
});

router.get("/", requireCoreAuth, async (_req: Request, res: Response) => {
  const rows = await queryAll("SELECT * FROM modules ORDER BY name");
  res.json(rows);
});

router.patch("/:id", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { name, slug, category, description, icon, tier, active } = req.body;
  const fields: string[] = [];
  const values: any[] = [];

  if (name !== undefined) { fields.push("name = ?"); values.push(name); }
  if (slug !== undefined) { fields.push("slug = ?"); values.push(slug); }
  if (category !== undefined) { fields.push("category = ?"); values.push(category); }
  if (description !== undefined) { fields.push("description = ?"); values.push(description); }
  if (icon !== undefined) { fields.push("icon = ?"); values.push(icon); }
  if (tier !== undefined) { fields.push("tier = ?"); values.push(tier); }
  if (active !== undefined) { fields.push("active = ?"); values.push(!!active); }

  if (fields.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar" });

  fields.push("updated_at = NOW()");
  values.push(req.params.id);
  await runSql(`UPDATE modules SET ${fields.join(", ")} WHERE id = ?`, values);
  res.json({ ok: true });
});

// ─── Permissões dos módulos ────────────────────────────────────────────

router.get("/:moduleId/permissions", requireCoreAuth, async (req: Request, res: Response) => {
  const rows = await queryAll(
    "SELECT * FROM module_permissions WHERE module_id = ? ORDER BY role, action",
    [req.params.moduleId]
  );
  res.json(rows);
});

router.post("/:moduleId/permissions", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { role, action } = req.body;
  if (!role) return res.status(400).json({ error: "role é obrigatório" });

  const id = crypto.randomUUID();
  await runSql(
    "INSERT INTO module_permissions (id, module_id, role, action) VALUES (?, ?, ?, ?)",
    [id, req.params.moduleId, role, action || "access"]
  );
  res.status(201).json({ id, module_id: req.params.moduleId, role, action: action || "access" });
});

router.delete("/:moduleId/permissions/:permId", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  await runSql("DELETE FROM module_permissions WHERE id = ? AND module_id = ?", [req.params.permId, req.params.moduleId]);
  res.json({ ok: true });
});

// ─── Dependências dos módulos ─────────────────────────────────────────

router.get("/:moduleId/dependencies", requireCoreAuth, async (req: Request, res: Response) => {
  const rows = await queryAll(
    `SELECT md.id, md.depends_on, m.name AS depends_on_name, m.slug AS depends_on_slug
     FROM module_dependencies md
     JOIN modules m ON m.id = md.depends_on
     WHERE md.module_id = ?
     ORDER BY m.name`,
    [req.params.moduleId]
  );
  res.json(rows);
});

router.post("/:moduleId/dependencies", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { depends_on } = req.body;
  if (!depends_on) return res.status(400).json({ error: "depends_on é obrigatório" });

  const id = crypto.randomUUID();
  await runSql(
    "INSERT INTO module_dependencies (id, module_id, depends_on) VALUES (?, ?, ?)",
    [id, req.params.moduleId, depends_on]
  );
  res.status(201).json({ id, module_id: req.params.moduleId, depends_on });
});

router.delete("/:moduleId/dependencies/:depId", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  await runSql("DELETE FROM module_dependencies WHERE id = ? AND module_id = ?", [req.params.depId, req.params.moduleId]);
  res.json({ ok: true });
});

// ─── Configurações por tenant ────────────────────────────────────────

router.get("/configs/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const rows = await queryAll(
    `SELECT mc.id, mc.module_id, m.name AS module_name, mc.key, mc.value
     FROM module_configs mc
     JOIN modules m ON m.id = mc.module_id
     WHERE mc.empresa_id = ?
     ORDER BY m.name, mc.key`,
    [empresaId]
  );
  res.json(rows);
});

router.put("/configs/:empresaId/:moduleId/:key", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { value } = req.body;
  const existing = await queryOne(
    "SELECT 1 FROM module_configs WHERE empresa_id = ? AND module_id = ? AND key = ?",
    [empresaId, req.params.moduleId, req.params.key]
  );
  if (existing) {
    await runSql(
      "UPDATE module_configs SET value = ?, updated_at = NOW() WHERE empresa_id = ? AND module_id = ? AND key = ?",
      [value ?? "", empresaId, req.params.moduleId, req.params.key]
    );
  } else {
    const id = crypto.randomUUID();
    await runSql(
      "INSERT INTO module_configs (id, empresa_id, module_id, key, value) VALUES (?, ?, ?, ?, ?)",
      [id, empresaId, req.params.moduleId, req.params.key, value ?? ""]
    );
  }
  res.json({ ok: true, empresa_id: empresaId, module_id: req.params.moduleId, key: req.params.key, value });
});

router.delete("/configs/:empresaId/:moduleId/:key", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  await runSql(
    "DELETE FROM module_configs WHERE empresa_id = ? AND module_id = ? AND key = ?",
    [empresaId, req.params.moduleId, req.params.key]
  );
  res.json({ ok: true });
});

// ─── Logs dos módulos ────────────────────────────────────────────────

router.get("/logs", requireCoreAuth, async (req: Request, res: Response) => {
  const { empresa_id, module_id, limit } = req.query;
  const conditions: string[] = [];
  const values: any[] = [];

  if (empresa_id) { conditions.push("ml.empresa_id = ?"); values.push(empresa_id); }
  if (module_id) { conditions.push("ml.module_id = ?"); values.push(module_id); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const maxRows = Math.min(Number(limit) || 50, 200);
  values.push(maxRows);

  const rows = await queryAll(
    `SELECT ml.*, m.name AS module_name
     FROM module_logs ml
     JOIN modules m ON m.id = ml.module_id
     ${where}
     ORDER BY ml.created_at DESC
     LIMIT ?`,
    values
  );
  res.json(rows);
});

// ─── Endpoints legados (mantidos para compatibilidade) ──────────────

// Quais módulos uma empresa tem habilitados
router.get("/empresas/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const rows = await queryAll(
    `SELECT m.id, m.name, m.slug, m.category, m.description, m.icon, m.tier,
            COALESCE(cm.active, FALSE) as active
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

    // Log
    const user = (req as any).user;
    const logId = crypto.randomUUID();
    await runSql(
      "INSERT INTO module_logs (id, empresa_id, module_id, action, details, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [logId, empresaId, moduleId, active ? "ativado" : "desativado", JSON.stringify({ by: user?.email }), user?.id]
    );

    res.json({ ok: true, empresa_id: empresaId, module_id: moduleId, active: !!active });
  }
);

export default router;
