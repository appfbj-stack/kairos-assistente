import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, scopeEmpresaId } from "../core/auth.js";
import { chatCompletion } from "../llm/llm.js";

const router = Router();

router.post("/message", requireCoreAuth, async (req: Request, res: Response) => {
  const { empresa_id, conversation_id, content, role, use_ai } = req.body;
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

  if (use_ai) {
    try {
      const knowledge = await queryAll(
        "SELECT title, content FROM atendimento_knowledge WHERE empresa_id = ? AND active = TRUE",
        [empresaId]
      );
      const assistant = await queryOne(
        "SELECT name, personality FROM atendimento_assistants WHERE empresa_id = ? AND active = TRUE LIMIT 1",
        [empresaId]
      );
      const personality = (assistant as any)?.personality || "Você é um assistente virtual amigável e prestativo.";
      const knowledgeContext = knowledge.map((k: any) => `- ${k.title}: ${k.content}`).join("\n") || "Nenhum conhecimento específico cadastrado.";
      const systemMsg = `${personality}\n\nBase de conhecimento:\n${knowledgeContext}\n\nResponda com base apenas no conhecimento acima. Se não souber, diga que não tem essa informação.`;

      const history = await queryAll(
        "SELECT role, content FROM atendimento_messages WHERE conversation_id = ? ORDER BY created_at ASC",
        [conversation_id]
      );

      const messages = [
        { role: "system", content: systemMsg },
        ...history.map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      ];

      const reply = await chatCompletion(messages);
      const replyId = crypto.randomUUID();
      await runSql(
        "INSERT INTO atendimento_messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)",
        [replyId, conversation_id, reply]
      );
      await runSql("UPDATE atendimento_conversations SET updated_at = NOW() WHERE id = ?", [conversation_id]);

      return res.status(201).json({ id, reply_id: replyId, reply });
    } catch (err: any) {
      return res.status(201).json({ id, reply: null, error: err.message });
    }
  }

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
