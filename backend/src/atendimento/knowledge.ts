import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, scopeEmpresaId } from "../core/auth.js";

const router = Router();

router.get("/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { type, search } = req.query;
  let sql = "SELECT * FROM atendimento_knowledge WHERE empresa_id = ?";
  const params: any[] = [empresaId];

  if (type) { sql += " AND type = ?"; params.push(type); }
  if (search) { sql += " AND (title LIKE ? OR content LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
  sql += " ORDER BY title";

  const rows = await queryAll(sql, params);
  res.json(rows);
});

router.post("/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { type, title, content, category, tags } = req.body;
  if (!title || !content) return res.status(400).json({ error: "title e content são obrigatórios" });

  const id = crypto.randomUUID();
  const user = (req as any).user;
  await runSql(
    "INSERT INTO atendimento_knowledge (id, empresa_id, type, title, content, category, tags, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, empresaId, type || "custom", title, content, category || "", tags || "", user?.id]
  );
  res.status(201).json({ id });
});

router.put("/:empresaId/:knowledgeId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { type, title, content, category, tags, active } = req.body;
  const fields: string[] = [];
  const values: any[] = [];

  if (type !== undefined) { fields.push("type = ?"); values.push(type); }
  if (title !== undefined) { fields.push("title = ?"); values.push(title); }
  if (content !== undefined) { fields.push("content = ?"); values.push(content); }
  if (category !== undefined) { fields.push("category = ?"); values.push(category); }
  if (tags !== undefined) { fields.push("tags = ?"); values.push(tags); }
  if (active !== undefined) { fields.push("active = ?"); values.push(!!active); }

  if (fields.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar" });
  fields.push("updated_at = NOW()");
  values.push(req.params.knowledgeId);
  await runSql(`UPDATE atendimento_knowledge SET ${fields.join(", ")} WHERE id = ? AND empresa_id = ?`, [...values, empresaId]);
  res.json({ ok: true });
});

router.delete("/:empresaId/:knowledgeId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  await runSql("DELETE FROM atendimento_knowledge WHERE id = ? AND empresa_id = ?", [req.params.knowledgeId, empresaId]);
  res.json({ ok: true });
});

export default router;
