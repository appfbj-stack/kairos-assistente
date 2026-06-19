import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, requireRole, scopeEmpresaId } from "./auth.js";

const router = Router();

// ─── Catálogo de agentes ────────────────────────────────────────────────

router.post("/", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { name, slug, description, icon, category, tier, config_schema } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "name e slug são obrigatórios" });

  const id = crypto.randomUUID();
  await runSql(
    "INSERT INTO agents (id, name, slug, description, icon, category, tier, config_schema) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, name, slug, description || "", icon || "", category || "produtividade", tier || "pro", config_schema || "{}"]
  );
  res.status(201).json({ id, name, slug });
});

router.get("/", requireCoreAuth, async (_req: Request, res: Response) => {
  const rows = await queryAll("SELECT * FROM agents ORDER BY name");
  res.json(rows);
});

router.patch("/:id", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { name, slug, description, icon, category, tier, config_schema, active } = req.body;
  const fields: string[] = [];
  const values: any[] = [];

  if (name !== undefined) { fields.push("name = ?"); values.push(name); }
  if (slug !== undefined) { fields.push("slug = ?"); values.push(slug); }
  if (description !== undefined) { fields.push("description = ?"); values.push(description); }
  if (icon !== undefined) { fields.push("icon = ?"); values.push(icon); }
  if (category !== undefined) { fields.push("category = ?"); values.push(category); }
  if (tier !== undefined) { fields.push("tier = ?"); values.push(tier); }
  if (config_schema !== undefined) { fields.push("config_schema = ?"); values.push(config_schema); }
  if (active !== undefined) { fields.push("active = ?"); values.push(!!active); }

  if (fields.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar" });

  fields.push("updated_at = NOW()");
  values.push(req.params.id);
  await runSql(`UPDATE agents SET ${fields.join(", ")} WHERE id = ?`, values);
  res.json({ ok: true });
});

// ─── Ferramentas dos agentes ──────────────────────────────────────────

router.get("/:agentId/tools", requireCoreAuth, async (req: Request, res: Response) => {
  const rows = await queryAll(
    "SELECT * FROM agent_tools WHERE agent_id = ? ORDER BY name",
    [req.params.agentId]
  );
  res.json(rows);
});

router.post("/:agentId/tools", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { name, description, input_schema } = req.body;
  if (!name) return res.status(400).json({ error: "name é obrigatório" });

  const id = crypto.randomUUID();
  await runSql(
    "INSERT INTO agent_tools (id, agent_id, name, description, input_schema) VALUES (?, ?, ?, ?, ?)",
    [id, req.params.agentId, name, description || "", input_schema || "{}"]
  );
  res.status(201).json({ id, agent_id: req.params.agentId, name, description, input_schema });
});

router.delete("/:agentId/tools/:toolId", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  await runSql("DELETE FROM agent_tools WHERE id = ? AND agent_id = ?", [req.params.toolId, req.params.agentId]);
  res.json({ ok: true });
});

// ─── Módulos vinculados ao agente ────────────────────────────────────

router.get("/:agentId/modules", requireCoreAuth, async (req: Request, res: Response) => {
  const rows = await queryAll(
    `SELECT am.module_id, m.name, m.slug
     FROM agent_modules am
     JOIN modules m ON m.id = am.module_id
     WHERE am.agent_id = ?
     ORDER BY m.name`,
    [req.params.agentId]
  );
  res.json(rows);
});

router.post("/:agentId/modules/:moduleId", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  await runSql(
    "INSERT INTO agent_modules (agent_id, module_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
    [req.params.agentId, req.params.moduleId]
  );
  res.status(201).json({ ok: true, agent_id: req.params.agentId, module_id: req.params.moduleId });
});

router.delete("/:agentId/modules/:moduleId", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  await runSql(
    "DELETE FROM agent_modules WHERE agent_id = ? AND module_id = ?",
    [req.params.agentId, req.params.moduleId]
  );
  res.json({ ok: true });
});

// ─── Ativação de agentes por empresa ──────────────────────────────────

router.get("/empresas/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const rows = await queryAll(
    `SELECT a.id, a.name, a.slug, a.description, a.icon, a.category, a.tier,
            COALESCE(ta.active, FALSE) as active, ta.config
     FROM agents a
     LEFT JOIN tenant_agents ta ON ta.agent_id = a.id AND ta.empresa_id = ?
     WHERE a.active = TRUE
     ORDER BY a.name`,
    [empresaId]
  );
  res.json(rows);
});

router.post("/empresas/:empresaId/:agentId", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { empresaId, agentId } = req.params;
  const { active, config } = req.body;

  const existing = await queryOne(
    "SELECT 1 FROM tenant_agents WHERE empresa_id = ? AND agent_id = ?",
    [empresaId, agentId]
  );
  if (existing) {
    await runSql(
      "UPDATE tenant_agents SET active = ?, config = COALESCE(?, config), updated_at = NOW() WHERE empresa_id = ? AND agent_id = ?",
      [!!active, config ? JSON.stringify(config) : null, empresaId, agentId]
    );
  } else {
    await runSql(
      "INSERT INTO tenant_agents (empresa_id, agent_id, active, config) VALUES (?, ?, ?, ?)",
      [empresaId, agentId, !!active, config ? JSON.stringify(config) : "{}"]
    );
  }

  const user = (req as any).user;
  const logId = crypto.randomUUID();
  await runSql(
    "INSERT INTO agent_logs (id, empresa_id, agent_id, action, details, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    [logId, empresaId, agentId, active ? "ativado" : "desativado", JSON.stringify({ by: user?.email }), user?.id]
  );

  res.json({ ok: true, empresa_id: empresaId, agent_id: agentId, active: !!active });
});

// ─── Logs dos agentes ────────────────────────────────────────────────

router.get("/logs", requireCoreAuth, async (req: Request, res: Response) => {
  const { empresa_id, agent_id, limit } = req.query;
  const conditions: string[] = [];
  const values: any[] = [];

  if (empresa_id) { conditions.push("al.empresa_id = ?"); values.push(empresa_id); }
  if (agent_id) { conditions.push("al.agent_id = ?"); values.push(agent_id); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const maxRows = Math.min(Number(limit) || 50, 200);
  values.push(maxRows);

  const rows = await queryAll(
    `SELECT al.*, a.name AS agent_name
     FROM agent_logs al
     JOIN agents a ON a.id = al.agent_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT ?`,
    values
  );
  res.json(rows);
});

export default router;