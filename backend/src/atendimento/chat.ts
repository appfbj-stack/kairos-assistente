import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, scopeEmpresaId } from "../core/auth.js";

const router = Router();

router.post("/message", requireCoreAuth, async (req: Request, res: Response) => {
  const { empresa_id, conversation_id, content, role } = req.body;
  if (!empresa_id || !conversation_id || !content || !role) {
    return res.status(400).json({ error: "empresa_id, conversation_id, content e role são obrigatórios" });
  }

  const empresaId = scopeEmpresaId(req, String(empresa_id));
  if (empresaId !== empresa_id) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const conv = await queryOne("SELECT id FROM atendimento_conversations WHERE id = ? AND empresa_id = ?", [conversation_id, empresaId]);
  if (!conv) return res.status(404).json({ error: "Conversa não encontrada" });

  const id = crypto.randomUUID();
  await runSql(
    "INSERT INTO atendimento_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
    [id, conversation_id, role, content]
  );
  await runSql("UPDATE atendimento_conversations SET updated_at = NOW() WHERE id = ?", [conversation_id]);

  res.status(201).json({ id });
});

router.get("/:empresaId/:conversationId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const rows = await queryAll(
    "SELECT * FROM atendimento_messages WHERE conversation_id = ? ORDER BY created_at ASC",
    [req.params.conversationId]
  );
  res.json(rows);
});

export default router;
