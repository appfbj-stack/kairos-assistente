import { queryAll, queryOne, runSql } from "../database/database.js";
import { chatCompletion } from "../llm/llm.js";
import crypto from "crypto";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const API = `https://api.telegram.org/bot${TOKEN}`;

let offset = 0;
let running = false;

async function apiCall(method: string, data: any = {}): Promise<any> {
  try {
    const res = await fetch(`${API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (e) {
    return { ok: false };
  }
}

async function sendMessage(chatId: number, text: string) {
  return apiCall("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  });
}

async function sendAction(chatId: number, action: string) {
  return apiCall("sendChatAction", { chat_id: chatId, action });
}

function getSystemPrompt(userName: string): string {
  try {
    const clients = queryAll("SELECT name, company, category, status FROM clients ORDER BY created_at DESC LIMIT 10");
    const stats = queryOne("SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM licenses");
    const clientList = clients.map((c: any) => `${c.name} (${c.category})`).join("; ");
    return `Você é o Kairos, assistente pessoal do usuário. 
Seja amigável, direto e útil. Responda em português brasileiro.

📊 Dados do sistema:
- Clientes: ${clients.length > 0 ? clientList : "Nenhum"}
- Licenças: ${stats?.total || 0} (${stats?.active || 0} ativas)

O usuário se chama ${userName}.`;
  } catch {
    return `Você é o Kairos, um assistente pessoal inteligente. Responda em português brasileiro.`;
  }
}

async function handleMessage(chatId: number, text: string, userName: string) {
  // Save to conversation history
  const convId = `tg_${chatId}`;

  // Ensure conversation exists
  let conv = queryOne("SELECT id FROM conversations WHERE id = ?", [convId]);
  if (!conv) {
    runSql("INSERT INTO conversations (id, title) VALUES (?, ?)", [convId, `Telegram - ${userName}`]);
  }

  // Save user message
  runSql("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)", [
    crypto.randomUUID(), convId, text,
  ]);
  runSql("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?", [convId]);

  // Get history
  const history = queryAll(
    "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at LIMIT 20",
    [convId]
  ) as { role: string; content: string }[];

  const llmMessages = [
    { role: "system", content: getSystemPrompt(userName) },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Send typing action
  await sendAction(chatId, "typing");

  try {
    const reply = await chatCompletion(llmMessages);

    // Save assistant message
    runSql("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)", [
      crypto.randomUUID(), convId, reply,
    ]);
    runSql("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?", [convId]);

    await sendMessage(chatId, reply);
  } catch (err: any) {
    await sendMessage(chatId, `❌ Erro: ${err.message}`);
  }
}

async function pollUpdates() {
  const result = await apiCall("getUpdates", {
    offset,
    timeout: 30,
    allowed_updates: ["message"],
  });

  if (!result.ok) return;

  for (const update of result.result || []) {
    offset = update.update_id + 1;
    const msg = update.message;
    if (!msg?.text) continue;

    const chatId = msg.chat.id;
    const text = msg.text;
    const userName = msg.from?.first_name || "Usuário";

    // Handle commands
    if (text === "/start") {
      await sendMessage(chatId, `Olá ${userName}! 👋\n\nSou o Kairos, seu assistente pessoal. Pergunte o que precisar!`);
      continue;
    }

    if (text === "/stats" || text === "/admin") {
      const stats = queryOne("SELECT COUNT(*) as clients FROM clients") as any;
      await sendMessage(chatId, `📊 <b>Kairos Admin</b>\n\nClientes: ${stats?.clients || 0}`);
      continue;
    }

    // Normal message - send to LLM
    await handleMessage(chatId, text, userName);
  }
}

export function startBot() {
  if (!TOKEN || running) return;
  running = true;
  console.log("🤖 Telegram Bot iniciado (@kairosop_bot)");

  const poll = async () => {
    try {
      await pollUpdates();
    } catch (e) {
      // Silent fail
    }
    if (running) setTimeout(poll, 1000);
  };

  poll();

  // Verify bot
  apiCall("getMe").then((r) => {
    if (r.ok) console.log(`✅ Bot: @${r.result.username}`);
  });
}

export function stopBot() {
  running = false;
}

export async function sendNotification(chatId: number, text: string) {
  return sendMessage(chatId, text);
}
