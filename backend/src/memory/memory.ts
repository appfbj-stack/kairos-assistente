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
    ? "SELECT * FROM memory_items WHERE empresa_id = ? ORDER BY category, key"
    : "SELECT * FROM memory_items ORDER BY category, key";
  const rows = await queryAll(sql, eid ? [eid] : []);
  res.json(rows);
});

router.post("/", async (req: Request, res: Response) => {
  const id = crypto.randomUUID();
  const { key, value, category } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: "key e value obrigatórios" });
  const eid = empresaFilter(req);

  const existing = eid
    ? await queryOne("SELECT id FROM memory_items WHERE key = ? AND empresa_id = ?", [key, eid])
    : await queryOne("SELECT id FROM memory_items WHERE key = ?", [key]);

  if (existing) {
    const params = eid
      ? [String(value), category || null, key, eid]
      : [String(value), category || null, key];
    const where = eid ? "key = ? AND empresa_id = ?" : "key = ?";
    await runSql(`UPDATE memory_items SET value = ?, category = COALESCE(?, category), updated_at = NOW() WHERE ${where}`, params);
    const item = eid
      ? await queryOne("SELECT * FROM memory_items WHERE key = ? AND empresa_id = ?", [key, eid])
      : await queryOne("SELECT * FROM memory_items WHERE key = ?", [key]);
    return res.json(item);
  }

  const sql = eid
    ? "INSERT INTO memory_items (id, key, value, category, empresa_id) VALUES (?, ?, ?, ?, ?)"
    : "INSERT INTO memory_items (id, key, value, category) VALUES (?, ?, ?, ?)";
  const params = eid ? [id, key, String(value), category || "general", eid] : [id, key, String(value), category || "general"];
  await runSql(sql, params);
  res.json({ id, key, value, category: category || "general", empresa_id: eid || null });
});

router.put("/:id", async (req: Request, res: Response) => {
  const { value, category } = req.body;
  const eid = empresaFilter(req);
  const params = eid
    ? [value || null, category || null, req.params.id, eid]
    : [value || null, category || null, req.params.id];
  const where = eid ? "id = ? AND empresa_id = ?" : "id = ?";
  await runSql(
    `UPDATE memory_items SET value = COALESCE(?, value), category = COALESCE(?, category), updated_at = NOW() WHERE ${where}`,
    params
  );
  res.json({ ok: true });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const eid = empresaFilter(req);
  const params = eid ? [req.params.id, eid] : [req.params.id];
  const where = eid ? "id = ? AND empresa_id = ?" : "id = ?";
  await runSql(`DELETE FROM memory_items WHERE ${where}`, params);
  res.json({ ok: true });
});

export default router;
