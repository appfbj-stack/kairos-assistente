import { Router, Request, Response } from "express";
import { queryAll, runSql } from "../database/database.js";
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
    ? "SELECT * FROM agenda_items WHERE empresa_id = ? ORDER BY date_time ASC"
    : "SELECT * FROM agenda_items ORDER BY date_time ASC";
  const rows = await queryAll(sql, eid ? [eid] : []);
  res.json(rows);
});

router.post("/", async (req: Request, res: Response) => {
  const id = crypto.randomUUID();
  const { title, description, date_time } = req.body;
  if (!title) return res.status(400).json({ error: "Título obrigatório" });
  const eid = empresaFilter(req);
  const sql = eid
    ? "INSERT INTO agenda_items (id, title, description, date_time, empresa_id) VALUES (?, ?, ?, ?, ?)"
    : "INSERT INTO agenda_items (id, title, description, date_time) VALUES (?, ?, ?, ?)";
  const params = eid
    ? [id, title, description || "", date_time || null, eid]
    : [id, title, description || "", date_time || null];
  await runSql(sql, params);
  res.json({ id, title, description, date_time, status: "pending", empresa_id: eid || null });
});

router.put("/:id", async (req: Request, res: Response) => {
  const { title, description, date_time, status } = req.body;
  const eid = empresaFilter(req);
  const params = eid
    ? [title || null, description || null, date_time || null, status || null, req.params.id, eid]
    : [title || null, description || null, date_time || null, status || null, req.params.id];
  const where = eid ? "id = ? AND empresa_id = ?" : "id = ?";
  await runSql(
    `UPDATE agenda_items SET title = COALESCE(?, title), description = COALESCE(?, description), date_time = COALESCE(?, date_time), status = COALESCE(?, status), updated_at = NOW() WHERE ${where}`,
    params
  );
  res.json({ ok: true });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const eid = empresaFilter(req);
  const params = eid ? [req.params.id, eid] : [req.params.id];
  const where = eid ? "id = ? AND empresa_id = ?" : "id = ?";
  await runSql(`DELETE FROM agenda_items WHERE ${where}`, params);
  res.json({ ok: true });
});

export default router;
