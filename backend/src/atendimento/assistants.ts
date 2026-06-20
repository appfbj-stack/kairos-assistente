import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, scopeEmpresaId } from "../core/auth.js";

const router = Router();

router.get("/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const rows = await queryAll("SELECT * FROM atendimento_assistants WHERE empresa_id = ? ORDER BY name", [empresaId]);
  res.json(rows);
});

router.post("/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { name, personality, goal, tone, segment, welcome_message, avatar_url } = req.body;
  const id = crypto.randomUUID();
  await runSql(
    "INSERT INTO atendimento_assistants (id, empresa_id, name, personality, goal, tone, segment, welcome_message, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, empresaId, name || "Assistente Virtual", personality || "", goal || "", tone || "", segment || "", welcome_message || "", avatar_url || ""]
  );
  res.status(201).json({ id, empresa_id: empresaId, name: name || "Assistente Virtual" });
});

router.put("/:empresaId/:assistantId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { name, personality, goal, tone, segment, welcome_message, avatar_url, active } = req.body;
  const fields: string[] = [];
  const values: any[] = [];

  if (name !== undefined) { fields.push("name = ?"); values.push(name); }
  if (personality !== undefined) { fields.push("personality = ?"); values.push(personality); }
  if (goal !== undefined) { fields.push("goal = ?"); values.push(goal); }
  if (tone !== undefined) { fields.push("tone = ?"); values.push(tone); }
  if (segment !== undefined) { fields.push("segment = ?"); values.push(segment); }
  if (welcome_message !== undefined) { fields.push("welcome_message = ?"); values.push(welcome_message); }
  if (avatar_url !== undefined) { fields.push("avatar_url = ?"); values.push(avatar_url); }
  if (active !== undefined) { fields.push("active = ?"); values.push(!!active); }

  if (fields.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar" });
  fields.push("updated_at = NOW()");
  values.push(req.params.assistantId);
  await runSql(`UPDATE atendimento_assistants SET ${fields.join(", ")} WHERE id = ? AND empresa_id = ?`, [...values, empresaId]);
  res.json({ ok: true });
});

router.delete("/:empresaId/:assistantId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  await runSql("DELETE FROM atendimento_assistants WHERE id = ? AND empresa_id = ?", [req.params.assistantId, empresaId]);
  res.json({ ok: true });
});

export default router;
