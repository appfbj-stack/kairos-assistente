import { Router, Request, Response } from "express";
import { getDb, queryAll, queryOne, runSql } from "../database/database.js";
import crypto from "crypto";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  await getDb();
  const rows = queryAll("SELECT * FROM memory_items ORDER BY category, key");
  res.json(rows);
});

router.post("/", async (req: Request, res: Response) => {
  await getDb();
  const id = crypto.randomUUID();
  const { key, value, category } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: "key e value obrigatórios" });

  const existing = queryOne("SELECT id FROM memory_items WHERE key = ?", [key]);
  if (existing) {
    runSql("UPDATE memory_items SET value = ?, category = COALESCE(?, category), updated_at = datetime('now') WHERE key = ?", [String(value), category || null, key]);
    const item = queryOne("SELECT * FROM memory_items WHERE key = ?", [key]);
    return res.json(item);
  }

  runSql("INSERT INTO memory_items (id, key, value, category) VALUES (?, ?, ?, ?)", [id, key, String(value), category || "general"]);
  res.json({ id, key, value, category: category || "general" });
});

router.put("/:id", async (req: Request, res: Response) => {
  await getDb();
  const { value, category } = req.body;
  runSql("UPDATE memory_items SET value = COALESCE(?, value), category = COALESCE(?, category), updated_at = datetime('now') WHERE id = ?",
    [value || null, category || null, req.params.id]);
  res.json({ ok: true });
});

router.delete("/:id", async (req: Request, res: Response) => {
  await getDb();
  runSql("DELETE FROM memory_items WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

export default router;
