import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, requireRole, scopeEmpresaId } from "./auth.js";
import { generateLicenseKey } from "./licenseKey.js";
import { TRIAL_DURATIONS_DAYS } from "./types.js";

const router = Router();

async function logLicenseAction(empresaId: string, licenseId: string, action: string, details = "") {
  await runSql(
    "INSERT INTO license_logs (id, empresa_id, license_id, action, details) VALUES (?, ?, ?, ?, ?)",
    [crypto.randomUUID(), empresaId, licenseId, action, details]
  );
}

// Criar licença em modo trial (7/15/30 dias) para uma empresa
router.post("/trial", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { empresa_id, plan, days } = req.body;
  if (!empresa_id || !days) return res.status(400).json({ error: "empresa_id e days são obrigatórios" });
  if (!TRIAL_DURATIONS_DAYS.includes(days)) {
    return res.status(400).json({ error: `days deve ser um de: ${TRIAL_DURATIONS_DAYS.join(", ")}` });
  }

  const empresa = await queryOne("SELECT id FROM empresas WHERE id = ? AND deleted_at IS NULL", [empresa_id]);
  if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

  const licenseId = crypto.randomUUID();
  const key = generateLicenseKey();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

  await runSql(
    "INSERT INTO tenant_licenses (id, empresa_id, license_key, plan, status, trial, expires_at) VALUES (?, ?, ?, ?, 'TRIAL', TRUE, ?)",
    [licenseId, empresa_id, key, plan || "Lite", expiresAt]
  );
  await runSql(
    "INSERT INTO license_keys (id, empresa_id, license_id, key, status, activated_at) VALUES (?, ?, ?, ?, 'ativa', NOW())",
    [crypto.randomUUID(), empresa_id, licenseId, key]
  );
  await runSql(
    "INSERT INTO trials (id, empresa_id, days, ends_at) VALUES (?, ?, ?, ?)",
    [crypto.randomUUID(), empresa_id, days, expiresAt]
  );
  await logLicenseAction(empresa_id, licenseId, "trial_created", `Trial de ${days} dias`);

  res.status(201).json({ id: licenseId, license_key: key, status: "TRIAL", expires_at: expiresAt });
});

// Gerar uma nova chave para uma licença existente (renovação/reemissão)
router.post("/:id/keys/generate", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const license = await queryOne("SELECT * FROM tenant_licenses WHERE id = ?", [req.params.id]);
  if (!license) return res.status(404).json({ error: "Licença não encontrada" });

  const key = generateLicenseKey();
  await runSql(
    "INSERT INTO license_keys (id, empresa_id, license_id, key) VALUES (?, ?, ?, ?)",
    [crypto.randomUUID(), (license as any).empresa_id, (license as any).id, key]
  );
  res.status(201).json({ key, status: "gerada" });
});

// Ativar chave (vincula a licença como ativa, plano pago)
router.post("/keys/:key/activate", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const keyRow = await queryOne("SELECT * FROM license_keys WHERE key = ?", [req.params.key]);
  if (!keyRow) return res.status(404).json({ error: "Chave não encontrada" });

  await runSql("UPDATE license_keys SET status = 'ativa', activated_at = NOW() WHERE key = ?", [req.params.key]);
  await runSql(
    "UPDATE tenant_licenses SET status = 'ATIVA', trial = FALSE, license_key = ?, updated_at = NOW() WHERE id = ?",
    [req.params.key, (keyRow as any).license_id]
  );
  await logLicenseAction((keyRow as any).empresa_id, (keyRow as any).license_id, "key_activated", String(req.params.key));
  res.json({ ok: true, status: "ATIVA" });
});

// Revogar chave
router.post("/keys/:key/revoke", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const keyRow = await queryOne("SELECT * FROM license_keys WHERE key = ?", [req.params.key]);
  if (!keyRow) return res.status(404).json({ error: "Chave não encontrada" });

  await runSql("UPDATE license_keys SET status = 'revogada', revoked_at = NOW() WHERE key = ?", [req.params.key]);
  await logLicenseAction((keyRow as any).empresa_id, (keyRow as any).license_id, "key_revoked", String(req.params.key));
  res.json({ ok: true });
});

// Suspender / bloquear / liberar / renovar licença
router.post("/:id/suspend", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  await runSql("UPDATE tenant_licenses SET status = 'SUSPENSA', updated_at = NOW() WHERE id = ?", [req.params.id]);
  await logLicenseAction("", String(req.params.id), "license_suspended");
  res.json({ ok: true, status: "SUSPENSA" });
});

router.post("/:id/block", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { reason } = req.body;
  await runSql(
    "UPDATE tenant_licenses SET status = 'BLOQUEADA', blocked = TRUE, blocked_reason = ?, updated_at = NOW() WHERE id = ?",
    [reason || "", req.params.id]
  );
  await logLicenseAction("", String(req.params.id), "license_blocked", reason || "");
  res.json({ ok: true, status: "BLOQUEADA" });
});

router.post("/:id/release", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  await runSql(
    "UPDATE tenant_licenses SET status = 'ATIVA', blocked = FALSE, blocked_reason = NULL, updated_at = NOW() WHERE id = ?",
    [req.params.id]
  );
  await logLicenseAction("", String(req.params.id), "license_released");
  res.json({ ok: true, status: "ATIVA" });
});

router.post("/:id/renew", requireCoreAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { days } = req.body;
  const extra = Number(days) > 0 ? Number(days) : 30;
  const license = await queryOne("SELECT * FROM tenant_licenses WHERE id = ?", [req.params.id]);
  if (!license) return res.status(404).json({ error: "Licença não encontrada" });

  const base = (license as any).expires_at ? new Date((license as any).expires_at) : new Date();
  const newExpiry = new Date(Math.max(base.getTime(), Date.now()) + extra * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  await runSql(
    "UPDATE tenant_licenses SET status = 'ATIVA', expires_at = ?, updated_at = NOW() WHERE id = ?",
    [newExpiry, req.params.id]
  );
  await logLicenseAction((license as any).empresa_id, String(req.params.id), "license_renewed", `+${extra} dias`);
  res.json({ ok: true, status: "ATIVA", expires_at: newExpiry });
});

router.get("/", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  const rows = empresaId
    ? await queryAll("SELECT * FROM tenant_licenses WHERE empresa_id = ? ORDER BY created_at DESC", [empresaId])
    : await queryAll("SELECT * FROM tenant_licenses ORDER BY created_at DESC");
  res.json(rows);
});

// Expira trials vencidos automaticamente (chamado por job periódico em main.ts)
export async function expireOverdueTrials(): Promise<number> {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const overdue = await queryAll(
    "SELECT * FROM tenant_licenses WHERE status = 'TRIAL' AND expires_at IS NOT NULL AND expires_at < ?",
    [now]
  );
  for (const license of overdue) {
    const l = license as any;
    await runSql("UPDATE tenant_licenses SET status = 'EXPIRADA', updated_at = NOW() WHERE id = ?", [l.id]);
    await runSql("UPDATE trials SET status = 'encerrado' WHERE empresa_id = ? AND status = 'ativo'", [l.empresa_id]);
    await logLicenseAction(l.empresa_id, l.id, "trial_expired", "Bloqueio automático por vencimento");
  }
  return overdue.length;
}

export default router;
