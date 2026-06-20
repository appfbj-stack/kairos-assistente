import { Router, Request, Response } from "express";
import { queryAll } from "../database/database.js";
import { requireCoreAuth, scopeEmpresaId } from "../core/auth.js";

const router = Router();

router.get("/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
  if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

  const { start_date, end_date } = req.query;
  const dateFilter = start_date && end_date
    ? "AND c.started_at >= ? AND c.started_at <= ?"
    : "";
  const params: any[] = [empresaId];
  if (start_date && end_date) { params.push(start_date, end_date); }

  const totalConversations = await queryAll(
    `SELECT DATE(c.started_at) AS date, COUNT(*) AS total
     FROM atendimento_conversations c
     WHERE c.empresa_id = ? ${dateFilter}
     GROUP BY DATE(c.started_at) ORDER BY date`,
    params
  );

  const conversationsByStatus = await queryAll(
    `SELECT c.status, COUNT(*) AS total
     FROM atendimento_conversations c
     WHERE c.empresa_id = ? ${dateFilter}
     GROUP BY c.status`,
    params
  );

  const leadsByStatus = await queryAll(
    `SELECT l.status, COUNT(*) AS total
     FROM atendimento_leads l
     WHERE l.empresa_id = ? ${dateFilter ? "AND l.created_at >= ? AND l.created_at <= ?" : ""}
     GROUP BY l.status`,
    start_date && end_date ? [empresaId, start_date, end_date] : [empresaId]
  );

  const knowledgeByType = await queryAll(
    "SELECT type, COUNT(*) AS total FROM atendimento_knowledge WHERE empresa_id = ? GROUP BY type",
    [empresaId]
  );

  const topInterests = await queryAll(
    `SELECT l.interest, COUNT(*) AS total
     FROM atendimento_leads l
     WHERE l.empresa_id = ? AND l.interest != ''
     GROUP BY l.interest ORDER BY total DESC LIMIT 10`,
    [empresaId]
  );

  res.json({
    conversation_trend: totalConversations,
    conversations_by_status: conversationsByStatus,
    leads_by_status: leadsByStatus,
    knowledge_by_type: knowledgeByType,
    top_interests: topInterests,
  });
});

export default router;
