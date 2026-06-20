import { Router, Request, Response } from "express";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, scopeEmpresaId } from "../core/auth.js";

const router = Router();

router.get("/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { status, channel } = req.query;
  let sql = `SELECT c.*, v.name AS visitor_name, v.phone AS visitor_phone,
    (SELECT content FROM atendimento_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
    FROM atendimento_conversations c
    LEFT JOIN atendimento_visitors v ON v.id = c.visitor_id
    WHERE c.empresa_id = ?`;
  const params: any[] = [empresaId];

  if (status) { sql += " AND c.status = ?"; params.push(status); }
  if (channel) { sql += " AND c.channel = ?"; params.push(channel); }
  sql += " ORDER BY c.updated_at DESC";

  const rows = await queryAll(sql, params);
  res.json(rows);
});

router.get("/:empresaId/:convId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const conv = await queryOne(
    "SELECT c.*, v.name AS visitor_name, v.phone AS visitor_phone, v.email AS visitor_email FROM atendimento_conversations c LEFT JOIN atendimento_visitors v ON v.id = c.visitor_id WHERE c.id = ? AND c.empresa_id = ?",
    [req.params.convId, empresaId]
  );
  if (!conv) return res.status(404).json({ error: "Conversa não encontrada" });

  const messages = await queryAll(
    "SELECT * FROM atendimento_messages WHERE conversation_id = ? ORDER BY created_at ASC",
    [req.params.convId]
  );

  res.json({ conversation: conv, messages });
});

router.patch("/:empresaId/:convId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { status, lead_id, assigned_to } = req.body;
  const fields: string[] = [];
  const values: any[] = [];

  if (status !== undefined) { fields.push("status = ?"); values.push(status); }
  if (lead_id !== undefined) { fields.push("lead_id = ?"); values.push(lead_id); }
  if (assigned_to !== undefined) { fields.push("assigned_to = ?"); values.push(assigned_to); }

  if (status === "closed") { fields.push("ended_at = NOW()"); }
  fields.push("updated_at = NOW()");

  values.push(req.params.convId);
  await runSql(`UPDATE atendimento_conversations SET ${fields.join(", ")} WHERE id = ? AND empresa_id = ?`, [...values, empresaId]);
  res.json({ ok: true });
});

export default router;
