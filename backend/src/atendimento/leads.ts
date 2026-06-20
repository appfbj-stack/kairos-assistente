import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, scopeEmpresaId } from "../core/auth.js";

const router = Router();

router.get("/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { status, source, search } = req.query;
  let sql = "SELECT * FROM atendimento_leads WHERE empresa_id = ?";
  const params: any[] = [empresaId];

  if (status) { sql += " AND status = ?"; params.push(status); }
  if (source) { sql += " AND source = ?"; params.push(source); }
  if (search) { sql += " AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += " ORDER BY created_at DESC";

  const rows = await queryAll(sql, params);
  res.json(rows);
});

router.get("/:empresaId/:leadId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const lead = await queryOne("SELECT * FROM atendimento_leads WHERE id = ? AND empresa_id = ?", [req.params.leadId, empresaId]);
  if (!lead) return res.status(404).json({ error: "Lead não encontrado" });
  res.json(lead);
});

router.post("/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { name, phone, whatsapp, email, interest, source, status, notes, conversation_id } = req.body;
  if (!name) return res.status(400).json({ error: "name é obrigatório" });

  const id = crypto.randomUUID();
  await runSql(
    "INSERT INTO atendimento_leads (id, empresa_id, conversation_id, name, phone, whatsapp, email, interest, source, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, empresaId, conversation_id || null, name, phone || "", whatsapp || "", email || "", interest || "", source || "web", status || "new", notes || ""]
  );
  res.status(201).json({ id });
});

router.put("/:empresaId/:leadId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { name, phone, whatsapp, email, interest, source, status, notes } = req.body;
  const fields: string[] = [];
  const values: any[] = [];

  if (name !== undefined) { fields.push("name = ?"); values.push(name); }
  if (phone !== undefined) { fields.push("phone = ?"); values.push(phone); }
  if (whatsapp !== undefined) { fields.push("whatsapp = ?"); values.push(whatsapp); }
  if (email !== undefined) { fields.push("email = ?"); values.push(email); }
  if (interest !== undefined) { fields.push("interest = ?"); values.push(interest); }
  if (source !== undefined) { fields.push("source = ?"); values.push(source); }
  if (status !== undefined) { fields.push("status = ?"); values.push(status); }
  if (notes !== undefined) { fields.push("notes = ?"); values.push(notes); }

  if (fields.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar" });
  fields.push("updated_at = NOW()");
  values.push(req.params.leadId);
  await runSql(`UPDATE atendimento_leads SET ${fields.join(", ")} WHERE id = ? AND empresa_id = ?`, [...values, empresaId]);
  res.json({ ok: true });
});

router.delete("/:empresaId/:leadId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  await runSql("DELETE FROM atendimento_leads WHERE id = ? AND empresa_id = ?", [req.params.leadId, empresaId]);
  res.json({ ok: true });
});

export default router;
