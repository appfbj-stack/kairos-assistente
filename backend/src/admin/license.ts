import { Router, Request, Response } from "express";
import crypto from "crypto";
import { getDb, queryAll, queryOne, runSql } from "../database/database.js";

const router = Router();

function addLog(client_id: string | null, app_id: string | null, action: string, details = "") {
  runSql("INSERT INTO logs (id, client_id, app_id, action, details) VALUES (?, ?, ?, ?, ?)",
    [crypto.randomUUID(), client_id, app_id, action, details]);
}

// Create trial license (10 days)
router.post("/create-trial", async (req: Request, res: Response) => {
  await getDb();
  const { client_name, company, phone, email, category, app_slug } = req.body;
  if (!client_name || !app_slug) return res.status(400).json({ error: "client_name e app_slug obrigatórios" });

  const app = queryOne("SELECT * FROM apps WHERE slug = ?", [app_slug]);
  if (!app) return res.status(400).json({ error: "App não encontrado" });

  let client = queryOne("SELECT * FROM clients WHERE email = ?", [email || ""]);
  if (!client) {
    const clientId = crypto.randomUUID();
    runSql("INSERT INTO clients (id, name, company, phone, email, category) VALUES (?, ?, ?, ?, ?, ?)",
      [clientId, client_name, company || "", phone || "", email || "", category || "Outros"]);
    client = { id: clientId, name: client_name };
  }

  const existingLicense = queryOne("SELECT * FROM licenses WHERE client_id = ? AND app_id = ?", [client.id, app.id]);
  if (existingLicense) {
    return res.json({ license: existingLicense, message: "Licença já existe para este cliente/app" });
  }

  const licenseId = crypto.randomUUID();
  const startDate = new Date().toISOString().slice(0, 19).replace("T", " ");
  const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

  runSql("INSERT INTO licenses (id, client_id, app_id, status, type, start_date, end_date) VALUES (?, ?, ?, 'trial', 'temporary', ?, ?)",
    [licenseId, client.id, app.id, startDate, endDate]);

  addLog(client.id as string, app.id as string, "trial_created", `Licença trial de 10 dias para ${client_name}`);

  res.json({
    license: { id: licenseId, client_id: client.id, app_id: app.id, status: "trial", type: "temporary", start_date: startDate, end_date: endDate },
    client: { id: client.id, name: client_name },
    message: `Licença trial criada. Expira em: ${endDate}`,
  });
});

// Verify license
router.get("/verify", async (req: Request, res: Response) => {
  await getDb();
  const { client_id, app_slug } = req.query;
  if (!client_id || !app_slug) return res.status(400).json({ error: "client_id e app_slug obrigatórios" });

  const app = queryOne("SELECT * FROM apps WHERE slug = ?", [app_slug]);
  if (!app) return res.status(400).json({ error: "App não encontrado" });

  const license = queryOne("SELECT l.*, c.name as client_name, c.status as client_status FROM licenses l JOIN clients c ON l.client_id = c.id WHERE l.client_id = ? AND l.app_id = ?", [client_id, app.id]);

  if (!license) {
    return res.json({ valid: false, status: "no_license", message: "Nenhuma licença encontrada." });
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const l = license as any;

  // Check expired trial
  if (l.status === "trial" && l.end_date && l.end_date < now) {
    runSql("UPDATE licenses SET status = 'expired', updated_at = datetime('now') WHERE id = ?", [l.id]);
    addLog(l.client_id, l.app_id, "license_expired", `Licença trial expirou em ${l.end_date}`);
    return res.json({ valid: false, status: "expired", message: "Seu período de avaliação terminou. Entre em contato para ativação." });
  }

  if (l.status === "expired") {
    return res.json({ valid: false, status: "expired", message: "Seu período de avaliação terminou. Entre em contato para ativação." });
  }

  if (l.status === "blocked") {
    return res.json({ valid: false, status: "blocked", message: "Acesso bloqueado. Entre em contato com o suporte." });
  }

  if (l.status === "active" || l.status === "trial") {
    addLog(l.client_id, l.app_id, "license_verified", `Licença verificada: ${l.status}`);
    return res.json({
      valid: true,
      status: l.status,
      type: l.type,
      client_name: l.client_name,
      days_remaining: l.end_date ? Math.max(0, Math.floor((new Date(l.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : -1,
      message: "Acesso liberado.",
    });
  }

  return res.json({ valid: false, status: l.status, message: "Status não reconhecido." });
});

// Activate license (after payment)
router.post("/activate", async (req: Request, res: Response) => {
  await getDb();
  const { license_id, amount, method } = req.body;
  if (!license_id) return res.status(400).json({ error: "license_id obrigatório" });

  const license = queryOne("SELECT * FROM licenses WHERE id = ?", [license_id]);
  if (!license) return res.status(404).json({ error: "Licença não encontrada" });

  runSql("UPDATE licenses SET status = 'active', type = 'permanent', updated_at = datetime('now') WHERE id = ?", [license_id]);
  runSql("UPDATE clients SET status = 'active', updated_at = datetime('now') WHERE id = ?", [(license as any).client_id]);

  if (amount) {
    runSql("INSERT INTO payments (id, client_id, license_id, amount, method, status) VALUES (?, ?, ?, ?, ?, 'confirmed')",
      [crypto.randomUUID(), (license as any).client_id, license_id, amount, method || ""]);
  }

  addLog((license as any).client_id, (license as any).app_id, "license_activated", `Licença ativada${amount ? ` - Pagamento: R$${amount}` : ""}`);

  res.json({ ok: true, status: "active", message: "Licença ativada com sucesso!" });
});

// List licenses
router.get("/list", async (req: Request, res: Response) => {
  await getDb();
  const { status, client_id } = req.query;
  let sql = "SELECT l.*, c.name as client_name, a.name as app_name FROM licenses l JOIN clients c ON l.client_id = c.id JOIN apps a ON l.app_id = a.id WHERE 1=1";
  const params: any[] = [];
  if (status) { sql += " AND l.status = ?"; params.push(status); }
  if (client_id) { sql += " AND l.client_id = ?"; params.push(client_id); }
  sql += " ORDER BY l.created_at DESC";
  res.json(queryAll(sql, params));
});

// Check expired licenses (cron endpoint)
router.post("/check-expired", async (_req: Request, res: Response) => {
  await getDb();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const expired = queryAll("SELECT * FROM licenses WHERE status = 'trial' AND end_date < ?", [now]);
  for (const l of expired) {
    runSql("UPDATE licenses SET status = 'expired', updated_at = datetime('now') WHERE id = ?", [(l as any).id]);
    addLog((l as any).client_id, (l as any).app_id, "license_expired", `Licença expirada automaticamente`);
  }
  res.json({ expired_count: expired.length });
});

export default router;
