import { Router, Request, Response } from "express";
import { getDb, queryAll, queryOne, runSql } from "../database/database.js";
import { chatCompletion } from "../llm/llm.js";
import crypto from "crypto";

const router = Router();

const SYSTEM_PROMPT = `Você é o Kairos, um assistente pessoal inteligente. 
Você ajuda com: conversas, lembretes, agenda, memória e informações.
Seja amigável, direto e útil. Responda em português brasileiro.`;

function buildSystemPrompt(): string {
  try {
    const clients = queryAll("SELECT name, company, category, status FROM clients ORDER BY created_at DESC LIMIT 20");
    const apps = queryAll("SELECT name, slug FROM apps ORDER BY name");
    const stats = queryOne("SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status='trial' THEN 1 ELSE 0 END) as trial, SUM(CASE WHEN status='expired' THEN 1 ELSE 0 END) as expired FROM licenses");

    const clientList = clients.map((c: any) => `${c.name} (${c.category}) - ${c.status}`).join("; ");
    const appList = apps.map((a: any) => `${a.name} (/${a.slug})`).join(", ");

    return `${SYSTEM_PROMPT}

## DADOS DO SISTEMA (Kairos Admin)
Clientes cadastrados: ${clients.length}
${clients.length > 0 ? `Lista: ${clientList}` : "Nenhum cliente cadastrado ainda."}

Apps disponíveis: ${apps.length > 0 ? appList : "Nenhum app cadastrado."}

Licenças: ${stats?.total || 0} total | ${stats?.active || 0} ativas | ${stats?.trial || 0} trial | ${stats?.expired || 0} expiradas

Você pode consultar esses dados se o usuário perguntar sobre clientes, licenças ou apps.`;
  } catch {
    return SYSTEM_PROMPT;
  }
}

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
      { role: "system", content: buildSystemPrompt() },
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
