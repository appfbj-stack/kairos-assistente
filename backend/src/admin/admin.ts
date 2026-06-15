import { Router, Request, Response } from "express";
import crypto from "crypto";
import { getDb, queryAll, queryOne, runSql } from "../database/database.js";

const router = Router();

// Clients
router.get("/clients", async (_req: Request, res: Response) => {
  await getDb();
  res.json(queryAll("SELECT * FROM clients ORDER BY created_at DESC"));
});

router.get("/clients/:id", async (req: Request, res: Response) => {
  await getDb();
  const client = queryOne("SELECT * FROM clients WHERE id = ?", [req.params.id]);
  if (!client) return res.status(404).json({ error: "Cliente não encontrado" });
  const licenses = queryAll("SELECT * FROM licenses WHERE client_id = ?", [req.params.id]);
  res.json({ ...client, licenses });
});

router.post("/clients", async (req: Request, res: Response) => {
  await getDb();
  const id = crypto.randomUUID();
  const { name, company, phone, email, category } = req.body;
  if (!name) return res.status(400).json({ error: "Nome obrigatório" });

  runSql("INSERT INTO clients (id, name, company, phone, email, category) VALUES (?, ?, ?, ?, ?, ?)",
    [id, name, company || "", phone || "", email || "", category || "Outros"]);

  res.json({ id, name, company, phone, email, category });
});

router.put("/clients/:id", async (req: Request, res: Response) => {
  await getDb();
  const { name, company, phone, email, category, status } = req.body;
  runSql("UPDATE clients SET name = COALESCE(?, name), company = COALESCE(?, company), phone = COALESCE(?, phone), email = COALESCE(?, email), category = COALESCE(?, category), status = COALESCE(?, status), updated_at = datetime('now') WHERE id = ?",
    [name || null, company || null, phone || null, email || null, category || null, status || null, req.params.id]);
  res.json({ ok: true });
});

router.delete("/clients/:id", async (req: Request, res: Response) => {
  await getDb();
  runSql("DELETE FROM clients WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

// Apps
router.get("/apps", async (_req: Request, res: Response) => {
  await getDb();
  res.json(queryAll("SELECT * FROM apps ORDER BY name"));
});

router.post("/apps", async (req: Request, res: Response) => {
  await getDb();
  const id = crypto.randomUUID();
  const { name, slug, description } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "name e slug obrigatórios" });
  try {
    runSql("INSERT INTO apps (id, name, slug, description) VALUES (?, ?, ?, ?)",
      [id, name, slug, description || ""]);
    res.json({ id, name, slug });
  } catch (err: any) {
    res.status(400).json({ error: "App já existe" });
  }
});

// Logs
router.get("/logs", async (req: Request, res: Response) => {
  await getDb();
  const { client_id, app_id, limit } = req.query;
  let sql = "SELECT * FROM logs WHERE 1=1";
  const params: any[] = [];
  if (client_id) { sql += " AND client_id = ?"; params.push(client_id); }
  if (app_id) { sql += " AND app_id = ?"; params.push(app_id); }
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(Number(limit) || 100);
  res.json(queryAll(sql, params));
});

// Dashboard stats
router.get("/stats", async (_req: Request, res: Response) => {
  await getDb();
  const totalClients = queryOne("SELECT COUNT(*) as count FROM clients");
  const totalLicenses = queryOne("SELECT COUNT(*) as count FROM licenses");
  const activeLicenses = queryOne("SELECT COUNT(*) as count FROM licenses WHERE status = 'active'");
  const trialLicenses = queryOne("SELECT COUNT(*) as count FROM licenses WHERE status = 'trial'");
  const expiredLicenses = queryOne("SELECT COUNT(*) as count FROM licenses WHERE status = 'expired'");
  res.json({
    total_clients: totalClients?.count || 0,
    total_licenses: totalLicenses?.count || 0,
    active_licenses: activeLicenses?.count || 0,
    trial_licenses: trialLicenses?.count || 0,
    expired_licenses: expiredLicenses?.count || 0,
  });
});

// Update license status (active/blocked/trial)
router.post("/licenses/:id/status", async (req: Request, res: Response) => {
  await getDb();
  const { status } = req.body;
  if (!["active", "blocked", "trial", "expired"].includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }
  const license = queryOne("SELECT * FROM licenses WHERE id = ?", [req.params.id]);
  if (!license) return res.status(404).json({ error: "Licença não encontrada" });
  runSql("UPDATE licenses SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, req.params.id]);
  addLog((license as any).client_id, (license as any).app_id, "status_changed", `Status alterado para: ${status}`);
  res.json({ ok: true, status });
});

export default router;
