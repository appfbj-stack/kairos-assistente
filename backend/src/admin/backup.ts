import { Router, Request, Response } from "express";
import { createBackup, listBackups } from "../database/backup.js";

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

router.post("/restore/:filename", async (_req: Request, res: Response) => {
  res.status(501).json({ error: "Restauração manual necessária via pg_restore ou JSON reimport" });
});

export default router;
