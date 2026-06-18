import { Router, Request, Response } from "express";
import { queryAll, queryOne, runSql } from "../database/database.js";
import crypto from "crypto";
import { requireCoreAuth, scopeEmpresaId } from "../core/auth.js";

const router = Router();

function empresaFilter(req: Request): string {
  const e = scopeEmpresaId(req, (req.query.empresa_id as string) || (req.body.empresa_id as string) || null);
  return e ?? "";
}

router.use(requireCoreAuth);

router.get("/", async (req: Request, res: Response) => {
  const eid = empresaFilter(req);
  const sql = eid
    ? "SELECT * FROM settings WHERE empresa_id = ?"
    : "SELECT * FROM settings";
  const rows = await queryAll(sql, eid ? [eid] : []);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key as string] = r.value as string;
  res.json(map);
});

router.put("/:key", async (req: Request, res: Response) => {
  const { value } = req.body;
  const eid = empresaFilter(req);
  const existing = eid
    ? await queryOne("SELECT id FROM settings WHERE key = ? AND empresa_id = ?", [req.params.key, eid])
    : await queryOne("SELECT id FROM settings WHERE key = ?", [req.params.key]);

  if (existing) {
    const params = eid ? [value, req.params.key, eid] : [value, req.params.key];
    const where = eid ? "key = ? AND empresa_id = ?" : "key = ?";
    await runSql(`UPDATE settings SET value = ?, updated_at = NOW() WHERE ${where}`, params);
  } else {
    const sql = eid
      ? "INSERT INTO settings (id, key, value, empresa_id) VALUES (?, ?, ?, ?)"
      : "INSERT INTO settings (id, key, value) VALUES (?, ?, ?)";
    const params = eid ? [crypto.randomUUID(), req.params.key, value, eid] : [crypto.randomUUID(), req.params.key, value];
    await runSql(sql, params);
  }

  res.json({ key: req.params.key, value, empresa_id: eid || null });
});

export default router;
