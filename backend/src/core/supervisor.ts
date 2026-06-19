import { Router, Request, Response } from "express";
import { queryAll } from "../database/database.js";
import { requireCoreAuth, scopeEmpresaId } from "./auth.js";

const router = Router();

router.get("/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const [modules, agents] = await Promise.all([
    queryAll(
      `SELECT m.id, m.name, m.slug, m.category, m.description, m.icon, m.tier
       FROM modules m
       JOIN company_modules cm ON cm.module_id = m.id AND cm.empresa_id = ?
       WHERE m.active = TRUE AND cm.active = TRUE
       ORDER BY m.name`,
      [empresaId]
    ),
    queryAll(
      `SELECT a.id, a.name, a.slug, a.description, a.icon, a.category, a.tier,
              ta.config
       FROM agents a
       JOIN tenant_agents ta ON ta.agent_id = a.id AND ta.empresa_id = ?
       WHERE a.active = TRUE AND ta.active = TRUE
       ORDER BY a.name`,
      [empresaId]
    ),
  ]);

  // Para cada agente ativo, buscar tools e módulos vinculados
  const agentIds = agents.map((a: any) => a.id);
  const toolsByAgent: Record<string, any[]> = {};
  const modulesByAgent: Record<string, any[]> = {};

  if (agentIds.length > 0) {
    const placeholders = agentIds.map(() => "?").join(",");

    const tools = await queryAll(
      `SELECT * FROM agent_tools WHERE agent_id IN (${placeholders}) ORDER BY name`,
      agentIds
    );
    for (const t of tools) {
      if (!toolsByAgent[t.agent_id]) toolsByAgent[t.agent_id] = [];
      toolsByAgent[t.agent_id].push(t);
    }

    const agentModules = await queryAll(
      `SELECT am.agent_id, am.module_id, m.name, m.slug
       FROM agent_modules am
       JOIN modules m ON m.id = am.module_id
       WHERE am.agent_id IN (${placeholders})
       ORDER BY m.name`,
      agentIds
    );
    for (const am of agentModules) {
      if (!modulesByAgent[am.agent_id]) modulesByAgent[am.agent_id] = [];
      modulesByAgent[am.agent_id].push({ id: am.module_id, name: am.name, slug: am.slug });
    }
  }

  const enrichedAgents = agents.map((a: any) => ({
    ...a,
    tools: toolsByAgent[a.id] || [],
    modules: modulesByAgent[a.id] || [],
  }));

  res.json({
    empresa_id: empresaId,
    modules,
    agents: enrichedAgents,
  });
});

export default router;