import { Router, Request, Response } from "express";
import { queryAll, queryOne } from "../database/database.js";
import { requireCoreAuth, scopeEmpresaId } from "../core/auth.js";

const router = Router();

router.get("/:empresaId", requireCoreAuth, async (req: Request, res: Response) => {
  try {
    const empresaId = scopeEmpresaId(req, String(req.params.empresaId));
    if (empresaId !== req.params.empresaId) return res.status(403).json({ error: "Sem acesso a esta empresa" });

    const [totalConv, activeConv, totalLeads, newLeads, totalMessages] = await Promise.all([
      queryOne("SELECT COUNT(*) AS total FROM atendimento_conversations WHERE empresa_id = ?", [empresaId]),
      queryOne("SELECT COUNT(*) AS total FROM atendimento_conversations WHERE empresa_id = ? AND status = 'active'", [empresaId]),
      queryOne("SELECT COUNT(*) AS total FROM atendimento_leads WHERE empresa_id = ?", [empresaId]),
      queryOne("SELECT COUNT(*) AS total FROM atendimento_leads WHERE empresa_id = ? AND status = 'new'", [empresaId]),
      queryOne("SELECT COUNT(*) AS total FROM atendimento_messages m JOIN atendimento_conversations c ON c.id = m.conversation_id WHERE c.empresa_id = ?", [empresaId]),
    ]);

    const recentConversations = await queryAll(
      "SELECT c.id, c.status, c.channel, c.started_at, v.name AS visitor_name, v.phone FROM atendimento_conversations c LEFT JOIN atendimento_visitors v ON v.id = c.visitor_id WHERE c.empresa_id = ? ORDER BY c.updated_at DESC LIMIT 10",
      [empresaId]
    );

    const conversationsByChannel = await queryAll(
      "SELECT channel, COUNT(*) AS total FROM atendimento_conversations WHERE empresa_id = ? GROUP BY channel",
      [empresaId]
    );

    const conversationTrend = await queryAll(
      `SELECT (started_at::date) AS date, COUNT(*) AS total FROM atendimento_conversations WHERE empresa_id = ? AND (started_at::timestamp) >= CURRENT_DATE - INTERVAL '7 days' GROUP BY (started_at::date) ORDER BY date`,
      [empresaId]
    );

    res.json({
      stats: {
        total_conversations: Number((totalConv as any)?.total || 0),
        active_conversations: Number((activeConv as any)?.total || 0),
        total_leads: Number((totalLeads as any)?.total || 0),
        new_leads: Number((newLeads as any)?.total || 0),
        total_messages: Number((totalMessages as any)?.total || 0),
      },
      recent_conversations: recentConversations,
      conversations_by_channel: conversationsByChannel,
      conversation_trend: conversationTrend,
    });
  } catch (err: any) {
    console.error("Dashboard error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
