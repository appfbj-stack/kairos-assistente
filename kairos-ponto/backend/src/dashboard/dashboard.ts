import { Router, Request, Response } from "express";
import { queryAll, queryOne } from "../database/database.js";
import { requireAuth, scopeEmpresaId } from "../core/auth.js";

const router = Router();

/**
 * Dashboard administrativo (PRD seção 14): presentes, ausentes, atrasados,
 * horas extras, banco de horas e funcionários ativos + gráficos.
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

  const hoje = new Date().toISOString().slice(0, 10);
  const inicioMes = hoje.slice(0, 8) + "01";

  const ativos = await queryOne(
    "SELECT COUNT(*) as total FROM funcionarios WHERE empresa_id = ? AND active = TRUE AND deleted_at IS NULL",
    [empresaId]
  );
  const presentes = await queryOne(
    "SELECT COUNT(DISTINCT funcionario_id) as total FROM registros_ponto WHERE empresa_id = ? AND data = ? AND tipo = 'entrada'",
    [empresaId, hoje]
  );
  const atrasados = await queryOne(
    `SELECT COUNT(*) as total FROM (
       SELECT r.funcionario_id, MIN(r.registrado_em) as primeira
       FROM registros_ponto r JOIN funcionarios f ON f.id = r.funcionario_id
       LEFT JOIN escalas e ON e.id = f.escala_id
       WHERE r.empresa_id = ? AND r.data = ? AND r.tipo = 'entrada'
       GROUP BY r.funcionario_id, e.horario_entrada, e.tolerancia_minutos
       HAVING to_char(MIN(r.registrado_em)::timestamp, 'HH24:MI') >
              to_char((COALESCE(MAX(e.horario_entrada),'08:00') || ':00')::time
                + (COALESCE(MAX(e.tolerancia_minutos),10) || ' minutes')::interval, 'HH24:MI')
     ) t`,
    [empresaId, hoje]
  );
  const extrasMin = await queryOne(
    "SELECT COALESCE(SUM(minutos),0) as total FROM banco_horas_movimentos WHERE empresa_id = ? AND tipo = 'extra' AND data >= ?",
    [empresaId, inicioMes]
  );
  const bancoSaldo = await queryOne(
    "SELECT COALESCE(SUM(minutos),0) as total FROM banco_horas_movimentos WHERE empresa_id = ?",
    [empresaId]
  );
  const suspeitos = await queryOne(
    "SELECT COUNT(*) as total FROM registros_ponto WHERE empresa_id = ? AND data = ? AND suspeito = TRUE",
    [empresaId, hoje]
  );
  const solicitacoesPendentes = await queryOne(
    "SELECT COUNT(*) as total FROM solicitacoes WHERE empresa_id = ? AND status IN ('solicitado','em_analise')",
    [empresaId]
  );

  // Gráfico: registros por dia nos últimos 7 dias.
  const frequencia7d = await queryAll(
    `SELECT data, COUNT(DISTINCT funcionario_id) as presentes
     FROM registros_ponto
     WHERE empresa_id = ? AND tipo = 'entrada' AND data >= ?
     GROUP BY data ORDER BY data`,
    [empresaId, new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)]
  );

  const totalAtivos = Number(ativos?.total || 0);
  const totalPresentes = Number(presentes?.total || 0);

  res.json({
    funcionarios_ativos: totalAtivos,
    presentes: totalPresentes,
    ausentes: Math.max(0, totalAtivos - totalPresentes),
    atrasados: Number(atrasados?.total || 0),
    horas_extras_mes_min: Number(extrasMin?.total || 0),
    banco_horas_saldo_min: Number(bancoSaldo?.total || 0),
    registros_suspeitos_hoje: Number(suspeitos?.total || 0),
    solicitacoes_pendentes: Number(solicitacoesPendentes?.total || 0),
    grafico_frequencia_7d: frequencia7d,
  });
});

export default router;
