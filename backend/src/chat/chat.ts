import { Router, Request, Response } from "express";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { chatCompletion } from "../llm/llm.js";
import crypto from "crypto";
import { requireCoreAuth, scopeEmpresaId } from "../core/auth.js";

const router = Router();

function empresaFilter(req: Request): string {
  const e = scopeEmpresaId(req, (req.query.empresa_id as string) || (req.body.empresa_id as string) || null);
  return e ?? "";
}

router.use(requireCoreAuth);

const SYSTEM_PROMPT = `Você é o Kairos, um assistente pessoal inteligente.
Você ajuda com: conversas, lembretes, agenda, memória e informações.
Seja amigável, direto e útil. Responda em português brasileiro.`;

async function buildSystemPrompt(): Promise<string> {
  try {
    const clients = await queryAll("SELECT name, company, category, status FROM clients ORDER BY created_at DESC LIMIT 20");
    const apps = await queryAll("SELECT name, slug FROM apps ORDER BY name");
    const stats = await queryOne(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status='trial' THEN 1 ELSE 0 END) as trial, SUM(CASE WHEN status='expired' THEN 1 ELSE 0 END) as expired FROM licenses"
    );

    const clientList = clients.map((c: any) => `${c.name} (${c.category}) - ${c.status}`).join("; ");
    const appList = apps.map((a: any) => `${a.name} (/${a.slug})`).join(", ");

    return `${SYSTEM_PROMPT}

## DADOS DO SISTEMA (Kairos Admin 2.0)
Clientes cadastrados: ${clients.length}
${clients.length > 0 ? `Lista: ${clientList}` : "Nenhum cliente cadastrado ainda."}

Apps disponíveis: ${apps.length > 0 ? appList : "Nenhum app cadastrado."}

Licenças: ${stats?.total || 0} total | ${stats?.active || 0} ativas | ${stats?.trial || 0} trial | ${stats?.expired || 0} expiradas

Você pode consultar esses dados se o usuário perguntar sobre clientes, licenças ou apps.`;
  } catch {
    return SYSTEM_PROMPT;
  }
}

router.get("/conversations", async (req: Request, res: Response) => {
  const eid = empresaFilter(req);
  const sql = eid
    ? "SELECT * FROM conversations WHERE empresa_id = ? ORDER BY updated_at DESC"
    : "SELECT * FROM conversations ORDER BY updated_at DESC";
  const params = eid ? [eid] : [];
  const rows = await queryAll(sql, params);
  res.json(rows);
});

router.post("/conversations", async (req: Request, res: Response) => {
  const id = crypto.randomUUID();
  const title = req.body.title || "Nova conversa";
  const eid = empresaFilter(req);
  if (eid) {
    await runSql("INSERT INTO conversations (id, title, empresa_id) VALUES (?, ?, ?)", [id, title, eid]);
  } else {
    await runSql("INSERT INTO conversations (id, title) VALUES (?, ?)", [id, title]);
  }
  res.json({ id, title, empresa_id: eid || null });
});

router.get("/conversations/:id", async (req: Request, res: Response) => {
  const eid = empresaFilter(req);
  const conv = eid
    ? await queryOne("SELECT * FROM conversations WHERE id = ? AND empresa_id = ?", [req.params.id, eid])
    : await queryOne("SELECT * FROM conversations WHERE id = ?", [req.params.id]);
  if (!conv) return res.status(404).json({ error: "Conversa não encontrada" });
  const messages = await queryAll("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at", [req.params.id]);
  res.json({ ...conv, messages });
});

router.delete("/conversations/:id", async (req: Request, res: Response) => {
  const eid = empresaFilter(req);
  const params = eid ? [req.params.id, eid] : [req.params.id];
  const where = eid ? "id = ? AND empresa_id = ?" : "id = ?";
  await runSql(`DELETE FROM messages WHERE conversation_id = ?`, [req.params.id]);
  await runSql(`DELETE FROM conversations WHERE ${where}`, params);
  res.json({ ok: true });
});

router.post("/send", async (req: Request, res: Response) => {
  try {
    const { conversation_id, message } = req.body;
    if (!message) return res.status(400).json({ error: "Mensagem obrigatória" });
    const eid = empresaFilter(req);

    let convId = conversation_id;
    if (!convId) {
      convId = crypto.randomUUID();
      if (eid) {
        await runSql("INSERT INTO conversations (id, title, empresa_id) VALUES (?, ?, ?)", [convId, message.slice(0, 50), eid]);
      } else {
        await runSql("INSERT INTO conversations (id, title) VALUES (?, ?)", [convId, message.slice(0, 50)]);
      }
    }

    await runSql("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)", [
      crypto.randomUUID(), convId, message,
    ]);
    await runSql("UPDATE conversations SET updated_at = NOW() WHERE id = ?", [convId]);

    const history = await queryAll(
      "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at",
      [convId]
    );

    const llmMessages = [
      { role: "system", content: await buildSystemPrompt() },
      ...history.map((m) => ({ role: m.role as string, content: m.content as string })),
    ];

    const reply = await chatCompletion(llmMessages);

    await runSql("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)", [
      crypto.randomUUID(), convId, reply,
    ]);
    await runSql("UPDATE conversations SET updated_at = NOW() WHERE id = ?", [convId]);

    res.json({ conversation_id: convId, message: reply, empresa_id: eid || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
