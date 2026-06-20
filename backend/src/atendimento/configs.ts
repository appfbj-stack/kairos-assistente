import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, scopeEmpresaId } from "../core/auth.js";

const router = Router();

router.get("/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const configs = await queryAll("SELECT key, value FROM atendimento_configs WHERE empresa_id = ?", [empresaId]);
  const whatsapp = await queryAll("SELECT * FROM atendimento_whatsapp_config WHERE empresa_id = ?", [empresaId]);
  res.json({ configs, whatsapp });
});

router.put("/:empresaId/:key", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { value } = req.body;
  const existing = await queryOne("SELECT 1 FROM atendimento_configs WHERE empresa_id = ? AND key = ?", [empresaId, req.params.key]);
  if (existing) {
    await runSql("UPDATE atendimento_configs SET value = ?, updated_at = NOW() WHERE empresa_id = ? AND key = ?", [value ?? "", empresaId, req.params.key]);
  } else {
    await runSql("INSERT INTO atendimento_configs (id, empresa_id, key, value) VALUES (?, ?, ?, ?)", [crypto.randomUUID(), empresaId, req.params.key, value ?? ""]);
  }
  res.json({ ok: true });
});

router.put("/whatsapp/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { provider, phone_number, api_key, webhook_url, webhook_secret, active } = req.body;
  const existing = await queryOne("SELECT id FROM atendimento_whatsapp_config WHERE empresa_id = ?", [empresaId]);
  if (existing) {
    await runSql(
      "UPDATE atendimento_whatsapp_config SET provider = ?, phone_number = ?, api_key = ?, webhook_url = ?, webhook_secret = ?, active = ?, updated_at = NOW() WHERE id = ?",
      [provider || "evolution", phone_number || "", api_key || "", webhook_url || "", webhook_secret || "", !!active, (existing as any).id]
    );
  } else {
    await runSql(
      "INSERT INTO atendimento_whatsapp_config (id, empresa_id, provider, phone_number, api_key, webhook_url, webhook_secret, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [crypto.randomUUID(), empresaId, provider || "evolution", phone_number || "", api_key || "", webhook_url || "", webhook_secret || "", !!active]
    );
  }
  res.json({ ok: true });
});

export default router;
