import { Router, Request, Response } from "express";
import { getDb, queryAll, runSql } from "../database/database.js";
import crypto from "crypto";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  await getDb();
  const rows = queryAll("SELECT * FROM agenda_items ORDER BY date_time ASC");
  res.json(rows);
});

router.post("/", async (req: Request, res: Response) => {
  await getDb();
  const id = crypto.randomUUID();
  const { title, description, date_time } = req.body;
  if (!title) return res.status(400).json({ error: "Título obrigatório" });
  runSql("INSERT INTO agenda_items (id, title, description, date_time) VALUES (?, ?, ?, ?)", [id, title, description || "", date_time || null]);
  res.json({ id, title, description, date_time, status: "pending" });
});

router.put("/:id", async (req: Request, res: Response) => {
  await getDb();
  const { title, description, date_time, status } = req.body;
  runSql("UPDATE agenda_items SET title = COALESCE(?, title), description = COALESCE(?, description), date_time = COALESCE(?, date_time), status = COALESCE(?, status), updated_at = datetime('now') WHERE id = ?",
    [title || null, description || null, date_time || null, status || null, req.params.id]);
  res.json({ ok: true });
});

router.delete("/:id", async (req: Request, res: Response) => {
  await getDb();
  runSql("DELETE FROM agenda_items WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

export default router;
