import { Router, Request, Response } from "express";
import { getDb, queryAll, queryOne, runSql } from "../database/database.js";
import crypto from "crypto";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  await getDb();
  const rows = queryAll("SELECT * FROM settings");
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key as string] = r.value as string;
  res.json(map);
});

router.put("/:key", async (req: Request, res: Response) => {
  await getDb();
  const { value } = req.body;
  const existing = queryOne("SELECT id FROM settings WHERE key = ?", [req.params.key]);
  if (existing) {
    runSql("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?", [value, req.params.key]);
  } else {
    runSql("INSERT INTO settings (id, key, value) VALUES (?, ?, ?)", [crypto.randomUUID(), req.params.key, value]);
  }
  res.json({ key: req.params.key, value });
});

export default router;
