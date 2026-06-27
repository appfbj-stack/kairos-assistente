import { Router, Request, Response } from "express";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireAuth } from "../core/auth.js";
import type { AuthUser } from "../core/types.js";

const router = Router();

// Notificações do usuário logado (PRD seção 17).
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  const apenasNaoLidas = req.query.nao_lidas === "true";
  const rows = await queryAll(
    `SELECT * FROM notificacoes WHERE user_id = ? ${apenasNaoLidas ? "AND lida = FALSE" : ""} ORDER BY created_at DESC LIMIT 100`,
    [actor.id]
  );
  res.json(rows);
});

router.patch("/:id/lida", requireAuth, async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  const n = await queryOne("SELECT user_id FROM notificacoes WHERE id = ?", [req.params.id]);
  if (!n) return res.status(404).json({ error: "Notificação não encontrada" });
  if (n.user_id !== actor.id) return res.status(403).json({ error: "Sem acesso" });
  await runSql("UPDATE notificacoes SET lida = TRUE WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

router.post("/marcar-todas", requireAuth, async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  await runSql("UPDATE notificacoes SET lida = TRUE WHERE user_id = ? AND lida = FALSE", [actor.id]);
  res.json({ ok: true });
});

export default router;
