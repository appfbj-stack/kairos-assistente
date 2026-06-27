import { Router, Request, Response } from "express";
import { queryAll, queryOne } from "../database/database.js";
import { requireAuth, requireRole, scopeEmpresaId } from "../core/auth.js";
import { chatCompletion } from "../llm/llm.js";

const router = Router();

/**
 * IA Kairos (PRD seção 18): detecta atrasos/faltas recorrentes, sugere ajustes
 * de escala e gera insights. Toda análise é montada sobre dados REAIS da empresa
 * (últimos 30 dias) — a IA interpreta, não inventa números.
 */
async function montarContexto(empresaId: string): Promise<string> {
  const inicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const totalFunc = await queryOne(
    "SELECT COUNT(*) as total FROM funcionarios WHERE empresa_id = ? AND active = TRUE AND deleted_at IS NULL",
    [empresaId]
  );
  const faltasRecorrentes = await queryAll(
    `SELECT f.nome, COUNT(*) as dias_sem_registro
     FROM funcionarios f
     WHERE f.empresa_id = ? AND f.active = TRUE AND f.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM registros_ponto r
         WHERE r.funcionario_id = f.id AND r.data >= ? AND r.tipo = 'entrada'
       )
     GROUP BY f.nome LIMIT 10`,
    [empresaId, inicio]
  );
  const suspeitas = await queryOne(
    "SELECT COUNT(*) as total FROM registros_ponto WHERE empresa_id = ? AND suspeito = TRUE AND data >= ?",
    [empresaId, inicio]
  );
  const extras = await queryOne(
    "SELECT COALESCE(SUM(minutos),0) as total FROM banco_horas_movimentos WHERE empresa_id = ? AND tipo = 'extra' AND data >= ?",
    [empresaId, inicio]
  );
  const solicitacoesPendentes = await queryOne(
    "SELECT COUNT(*) as total FROM solicitacoes WHERE empresa_id = ? AND status IN ('solicitado','em_analise')",
    [empresaId]
  );

  return `Você é a IA do Kairos Ponto, assistente de gestão de jornada de trabalho.
Responda em português brasileiro, de forma objetiva e prática, com base nos dados reais abaixo (últimos 30 dias).
Quando sugerir algo (ajuste de escala, atenção a um colaborador), seja específico. Deixe claro quando for uma estimativa.

## DADOS DA EMPRESA
Funcionários ativos: ${totalFunc?.total || 0}
Registros marcados como suspeitos: ${suspeitas?.total || 0}
Horas extras acumuladas (min): ${extras?.total || 0}
Solicitações pendentes de aprovação: ${solicitacoesPendentes?.total || 0}
Funcionários sem nenhuma marcação no período: ${faltasRecorrentes.map((f: any) => f.nome).join(", ") || "nenhum"}`;
}

router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req, req.body.empresa_id);
    if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message é obrigatório" });

    try {
      const systemPrompt = await montarContexto(empresaId);
      const reply = await chatCompletion([
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ]);
      res.json({ message: reply });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Insights automáticos (sem pergunta) para o dashboard.
router.get(
  "/insights",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
    if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });
    try {
      const systemPrompt = await montarContexto(empresaId);
      const reply = await chatCompletion([
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Gere 3 a 5 insights administrativos curtos (bullet points) sobre frequência, atrasos, faltas, horas extras e escalas, com base nos dados.",
        },
      ]);
      res.json({ insights: reply });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
