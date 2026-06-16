import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";

const router = Router();

// Clients
router.get("/clients", async (_req: Request, res: Response) => {
  const rows = await queryAll("SELECT * FROM clients ORDER BY created_at DESC");
  res.json(rows);
});

router.get("/clients/:id", async (req: Request, res: Response) => {
  const client = await queryOne("SELECT * FROM clients WHERE id = ?", [req.params.id]);
  if (!client) return res.status(404).json({ error: "Cliente não encontrado" });
  const licenses = await queryAll(
    "SELECT l.*, a.name as app_name, a.slug FROM licenses l JOIN apps a ON l.app_id = a.id WHERE l.client_id = ?",
    [req.params.id]
  );
  res.json({ ...client, licenses });
});

router.post("/clients", async (req: Request, res: Response) => {
  const id = crypto.randomUUID();
  const { name, company, phone, email, category } = req.body;
  if (!name) return res.status(400).json({ error: "Nome obrigatório" });
  await runSql(
    "INSERT INTO clients (id, name, company, phone, email, category) VALUES (?, ?, ?, ?, ?, ?)",
    [id, name, company || "", phone || "", email || "", category || "Outros"]
  );
  res.json({ id, name, company, phone, email, category });
});

router.put("/clients/:id", async (req: Request, res: Response) => {
  const { name, company, phone, email, category, status } = req.body;
  await runSql(
    "UPDATE clients SET name = COALESCE(?, name), company = COALESCE(?, company), phone = COALESCE(?, phone), email = COALESCE(?, email), category = COALESCE(?, category), status = COALESCE(?, status), updated_at = NOW() WHERE id = ?",
    [name || null, company || null, phone || null, email || null, category || null, status || null, req.params.id]
  );
  res.json({ ok: true });
});

router.delete("/clients/:id", async (req: Request, res: Response) => {
  await runSql("DELETE FROM clients WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

// Apps
router.get("/apps", async (_req: Request, res: Response) => {
  const rows = await queryAll("SELECT * FROM apps ORDER BY name");
  res.json(rows);
});

router.post("/apps", async (req: Request, res: Response) => {
  const id = crypto.randomUUID();
  const { name, slug, description, url, version, category, plan } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "name e slug obrigatórios" });
  try {
    await runSql(
      "INSERT INTO apps (id, name, slug, description, url, version, category, plan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, name, slug, description || "", url || "", version || "1.0.0", category || "SaaS", plan || "Lite"]
    );
    res.json({ id, name, slug });
  } catch {
    res.status(400).json({ error: "App já existe" });
  }
});

router.put("/apps/:id", async (req: Request, res: Response) => {
  const { name, description, url, version, category, plan, status } = req.body;
  await runSql(
    "UPDATE apps SET name = COALESCE(?, name), description = COALESCE(?, description), url = COALESCE(?, url), version = COALESCE(?, version), category = COALESCE(?, category), plan = COALESCE(?, plan), status = COALESCE(?, status) WHERE id = ?",
    [name || null, description || null, url || null, version || null, category || null, plan || null, status || null, req.params.id]
  );
  res.json({ ok: true });
});

router.delete("/apps/:id", async (req: Request, res: Response) => {
  await runSql("DELETE FROM apps WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

// Logs
router.get("/logs", async (req: Request, res: Response) => {
  const { client_id, app_id, limit } = req.query;
  let sql = `
    SELECT l.*, c.name as client_name, a.name as app_name
    FROM logs l
    LEFT JOIN clients c ON l.client_id = c.id
    LEFT JOIN apps a ON l.app_id = a.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (client_id) { sql += " AND l.client_id = ?"; params.push(client_id); }
  if (app_id) { sql += " AND l.app_id = ?"; params.push(app_id); }
  sql += " ORDER BY l.created_at DESC LIMIT ?";
  params.push(Number(limit) || 100);
  const rows = await queryAll(sql, params);
  res.json(rows);
});

// Dashboard stats
router.get("/stats", async (_req: Request, res: Response) => {
  const [totalClients, totalLicenses, activeLicenses, trialLicenses, expiredLicenses, blockedLicenses, revenue, totalApps] =
    await Promise.all([
      queryOne("SELECT COUNT(*) as count FROM clients"),
      queryOne("SELECT COUNT(*) as count FROM licenses"),
      queryOne("SELECT COUNT(*) as count FROM licenses WHERE status = 'active'"),
      queryOne("SELECT COUNT(*) as count FROM licenses WHERE status = 'trial'"),
      queryOne("SELECT COUNT(*) as count FROM licenses WHERE status = 'expired'"),
      queryOne("SELECT COUNT(*) as count FROM licenses WHERE status = 'blocked'"),
      queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'confirmed'"),
      queryOne("SELECT COUNT(*) as count FROM apps"),
    ]);

  res.json({
    total_clients: Number(totalClients?.count) || 0,
    total_licenses: Number(totalLicenses?.count) || 0,
    active_licenses: Number(activeLicenses?.count) || 0,
    trial_licenses: Number(trialLicenses?.count) || 0,
    expired_licenses: Number(expiredLicenses?.count) || 0,
    blocked_licenses: Number(blockedLicenses?.count) || 0,
    total_revenue: Number(revenue?.total) || 0,
    total_apps: Number(totalApps?.count) || 0,
  });
});

// Financial stats
router.get("/financial", async (_req: Request, res: Response) => {
  const payments = await queryAll(
    "SELECT p.*, c.name as client_name, a.name as app_name FROM payments p JOIN clients c ON p.client_id = c.id JOIN licenses l ON p.license_id = l.id JOIN apps a ON l.app_id = a.id ORDER BY p.created_at DESC LIMIT 50"
  );
  const monthly = await queryOne(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'confirmed' AND created_at >= TO_CHAR(DATE_TRUNC('month', NOW()), 'YYYY-MM-DD')"
  );
  const total = await queryOne(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'confirmed'"
  );

  res.json({
    payments,
    monthly_revenue: Number(monthly?.total) || 0,
    total_revenue: Number(total?.total) || 0,
  });
});

// Update license status
router.post("/licenses/:id/status", async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!["active", "blocked", "trial", "expired"].includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }
  const license = await queryOne("SELECT * FROM licenses WHERE id = ?", [req.params.id]);
  if (!license) return res.status(404).json({ error: "Licença não encontrada" });
  await runSql("UPDATE licenses SET status = ?, updated_at = NOW() WHERE id = ?", [status, req.params.id]);
  await runSql(
    "INSERT INTO logs (id, client_id, app_id, action, details) VALUES (?, ?, ?, 'status_changed', ?)",
    [crypto.randomUUID(), license.client_id, license.app_id, `Status alterado para: ${status}`]
  );
  res.json({ ok: true, status });
});

export default router;
