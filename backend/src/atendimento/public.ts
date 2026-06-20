import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { chatCompletion } from "../llm/llm.js";

const router = Router();

async function resolveEmpresa(slug: string) {
  return queryOne("SELECT id, name, slug FROM empresas WHERE slug = ? AND active = TRUE AND deleted_at IS NULL", [slug]);
}

router.get("/:slug", async (req: Request, res: Response) => {
  const empresa = await resolveEmpresa(String(req.params.slug));
  if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

  const assistant = await queryOne(
    "SELECT id, name, personality, welcome_message, avatar_url FROM atendimento_assistants WHERE empresa_id = ? AND active = TRUE LIMIT 1",
    [(empresa as any).id]
  );

  const knowledge = await queryAll(
    "SELECT id, type, title, content, category FROM atendimento_knowledge WHERE empresa_id = ? AND active = TRUE ORDER BY title",
    [(empresa as any).id]
  );

  const configs = await queryAll(
    "SELECT key, value FROM atendimento_configs WHERE empresa_id = ? AND key IN ('widget_title', 'widget_subtitle', 'widget_color', 'widget_position')",
    [(empresa as any).id]
  );

  res.json({
    empresa: { name: (empresa as any).name, slug: (empresa as any).slug },
    assistant,
    knowledge,
    configs: Object.fromEntries(configs.map((c: any) => [c.key, c.value])),
  });
});

router.post("/:slug/visit", async (req: Request, res: Response) => {
  const empresa = await resolveEmpresa(String(req.params.slug));
  if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

  const empresaId = (empresa as any).id;
  const { name, phone, email, interest } = req.body;
  const ip = req.ip || req.socket.remoteAddress || "";

  const visitorId = crypto.randomUUID();
  await runSql(
    "INSERT INTO atendimento_visitors (id, empresa_id, name, phone, email, interest, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [visitorId, empresaId, name || "", phone || "", email || "", interest || "", ip, req.headers["user-agent"] || ""]
  );

  const convId = crypto.randomUUID();
  await runSql(
    "INSERT INTO atendimento_conversations (id, empresa_id, visitor_id, channel) VALUES (?, ?, ?, 'web')",
    [convId, empresaId, visitorId]
  );

  const assistant = await queryOne(
    "SELECT welcome_message FROM atendimento_assistants WHERE empresa_id = ? AND active = TRUE LIMIT 1",
    [empresaId]
  );

  if (assistant) {
    const msgId = crypto.randomUUID();
    await runSql(
      "INSERT INTO atendimento_messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)",
      [msgId, convId, (assistant as any).welcome_message || "Olá! Como posso ajudar?"]
    );
  }

  res.status(201).json({ visitor_id: visitorId, conversation_id: convId });
});

router.post("/:slug/message", async (req: Request, res: Response) => {
  const empresa = await resolveEmpresa(String(req.params.slug));
  if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

  const empresaId = (empresa as any).id;
  const { conversation_id, content } = req.body;
  if (!conversation_id || !content) {
    return res.status(400).json({ error: "conversation_id e content são obrigatórios" });
  }

  const conv = await queryOne(
    "SELECT id FROM atendimento_conversations WHERE id = ? AND empresa_id = ?",
    [conversation_id, empresaId]
  );
  if (!conv) return res.status(404).json({ error: "Conversa não encontrada" });

  const msgId = crypto.randomUUID();
  await runSql(
    "INSERT INTO atendimento_messages (id, conversation_id, role, content) VALUES (?, ?, 'visitor', ?)",
    [msgId, conversation_id, content]
  );

  let reply: string;

  try {
    const knowledge = await queryAll(
      "SELECT title, content FROM atendimento_knowledge WHERE empresa_id = ? AND active = TRUE",
      [empresaId]
    );

    const assistant = await queryOne(
      "SELECT name, personality FROM atendimento_assistants WHERE empresa_id = ? AND active = TRUE LIMIT 1",
      [empresaId]
    );

    const name = (assistant as any)?.name || "Assistente Virtual";
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
      { role: "user", content },
    ];

    reply = await chatCompletion(messages);
  } catch {
    reply = "Obrigado pela mensagem! Um de nossos atendentes entrará em contato em breve.";
  }

  const replyId = crypto.randomUUID();
  await runSql(
    "INSERT INTO atendimento_messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)",
    [replyId, conversation_id, reply]
  );

  await runSql("UPDATE atendimento_conversations SET updated_at = NOW() WHERE id = ?", [conversation_id]);

  res.status(201).json({ reply });
});

export default router;
