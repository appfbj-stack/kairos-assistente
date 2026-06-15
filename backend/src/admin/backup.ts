import { Router, Request, Response } from "express";
import { getDb } from "../database/database.js";
import { createBackup, listBackups, restoreBackup } from "../database/backup.js";

const router = Router();

router.post("/create", async (_req: Request, res: Response) => {
  try {
    const filename = await createBackup();
    res.json({ ok: true, filename });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/list", (_req: Request, res: Response) => {
  const backups = listBackups();
  res.json(backups);
});

router.post("/restore/:filename", async (req: Request, res: Response) => {
  try {
    const ok = restoreBackup(req.params.filename);
    if (!ok) return res.status(404).json({ error: "Backup não encontrado" });
    await getDb();
    res.json({ ok: true, message: "Backup restaurado. Reinicie o servidor." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
