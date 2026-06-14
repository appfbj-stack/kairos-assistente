import { Router, Request, Response } from "express";
import { getDb, queryAll, queryOne, runSql } from "../database/database.js";
import { chatCompletion } from "../llm/llm.js";
import crypto from "crypto";

const router = Router();

const SYSTEM_PROMPT = `Você é o Kairos, um assistente pessoal inteligente. 
Você ajuda com: conversas, lembretes, agenda, memória e informações.
Seja amigável, direto e útil. Responda em português brasileiro.`;

router.get("/conversations", async (_req: Request, res: Response) => {
  await getDb();
  const rows = queryAll("SELECT * FROM conversations ORDER BY updated_at DESC");
  res.json(rows);
});

router.post("/conversations", async (req: Request, res: Response) => {
  await getDb();
  const id = crypto.randomUUID();
  const title = req.body.title || "Nova conversa";
  runSql("INSERT INTO conversations (id, title) VALUES (?, ?)", [id, title]);
  res.json({ id, title });
});

router.get("/conversations/:id", async (req: Request, res: Response) => {
  await getDb();
  const conv = queryOne("SELECT * FROM conversations WHERE id = ?", [req.params.id]);
  if (!conv) return res.status(404).json({ error: "Conversa não encontrada" });
  const messages = queryAll("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at", [req.params.id]);
  res.json({ ...conv, messages });
});

router.delete("/conversations/:id", async (req: Request, res: Response) => {
  await getDb();
  runSql("DELETE FROM messages WHERE conversation_id = ?", [req.params.id]);
  runSql("DELETE FROM conversations WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

router.post("/send", async (req: Request, res: Response) => {
  try {
    const { conversation_id, message } = req.body;
    if (!message) return res.status(400).json({ error: "Mensagem obrigatória" });

    await getDb();

    let convId = conversation_id;
    if (!convId) {
      convId = crypto.randomUUID();
      runSql("INSERT INTO conversations (id, title) VALUES (?, ?)", [convId, message.slice(0, 50)]);
    }

    runSql("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)", [crypto.randomUUID(), convId, message]);
    runSql("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?", [convId]);

    const history = queryAll("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at", [convId]);

    const llmMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role as string, content: m.content as string })),
    ];

    const reply = await chatCompletion(llmMessages);

    runSql("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)", [crypto.randomUUID(), convId, reply]);
    runSql("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?", [convId]);

    res.json({ conversation_id: convId, message: reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
