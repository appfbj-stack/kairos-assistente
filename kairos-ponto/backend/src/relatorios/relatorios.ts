import { Router, Request, Response } from "express";
import { queryAll, queryOne } from "../database/database.js";
import { requireAuth, scopeEmpresaId } from "../core/auth.js";
import type { AuthUser } from "../core/types.js";
import { apurarPeriodo } from "../bancohoras/apuracao.js";

const router = Router();

function minToHHMM(min: number): string {
  const sign = min < 0 ? "-" : "";
  const a = Math.abs(min);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

/** Atraso em minutos da entrada vs. escala (considera tolerância). */
function atrasoMin(entradaISO: string | undefined, horarioEntrada: string, tolerancia: number): number {
  if (!entradaISO) return 0;
  const d = new Date(entradaISO);
  const real = d.getHours() * 60 + d.getMinutes();
  const [h, m] = horarioEntrada.split(":").map(Number);
  const previsto = h * 60 + m + tolerancia;
  return Math.max(0, real - previsto);
}

async function carregarContexto(empresaId: string, funcionarioId: string, from: string, to: string) {
  const func = await queryOne(
    `SELECT f.id, f.nome, f.matricula, f.cargo, f.departamento,
            e.nome as escala_nome, e.horario_entrada, e.tolerancia_minutos
     FROM funcionarios f LEFT JOIN escalas e ON e.id = f.escala_id
     WHERE f.id = ? AND f.empresa_id = ?`,
    [funcionarioId, empresaId]
  );
  const registros = await queryAll(
    "SELECT tipo, registrado_em, data FROM registros_ponto WHERE funcionario_id = ? AND data >= ? AND data <= ? ORDER BY registrado_em",
    [funcionarioId, from, to]
  );
  const dias = await apurarPeriodo(empresaId, funcionarioId, from, to);
  return { func, registros, dias };
}

// Espelho de ponto de um funcionário (PRD seção 15).
router.get("/espelho", requireAuth, async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  const funcionarioId =
    actor.role === "FUNCIONARIO" ? actor.funcionario_id : (req.query.funcionario_id as string | undefined);
  const { from, to } = req.query as Record<string, string>;
  if (!empresaId || !funcionarioId || !from || !to) {
    return res.status(400).json({ error: "empresa_id, funcionario_id, from e to são obrigatórios" });
  }

  const { func, registros, dias } = await carregarContexto(empresaId, String(funcionarioId), from, to);
  if (!func) return res.status(404).json({ error: "Funcionário não encontrado" });

  const porDia: Record<string, Record<string, string>> = {};
  for (const r of registros) {
    porDia[r.data] = porDia[r.data] || {};
    porDia[r.data][r.tipo] = new Date(r.registrado_em).toISOString().slice(11, 16);
  }

  const linhas = dias.map((d) => {
    const marc = porDia[d.data] || {};
    const entradaISO = registros.find((r) => r.data === d.data && r.tipo === "entrada")?.registrado_em;
    const atraso = atrasoMin(entradaISO, func.horario_entrada || "08:00", func.tolerancia_minutos ?? 10);
    const falta = d.esperado_min > 0 && d.trabalhado_min === 0;
    return {
      data: d.data,
      entrada: marc.entrada || "",
      saida_almoco: marc.saida_almoco || "",
      retorno_almoco: marc.retorno_almoco || "",
      saida_final: marc.saida_final || "",
      trabalhado: minToHHMM(d.trabalhado_min),
      esperado: minToHHMM(d.esperado_min),
      saldo: minToHHMM(d.saldo_min),
      extra: minToHHMM(d.extra_min),
      atraso_min: atraso,
      falta,
    };
  });

  const totais = {
    trabalhado_min: dias.reduce((s, d) => s + d.trabalhado_min, 0),
    saldo_min: dias.reduce((s, d) => s + d.saldo_min, 0),
    extra_min: dias.reduce((s, d) => s + d.extra_min, 0),
    faltas: linhas.filter((l) => l.falta).length,
    atrasos: linhas.filter((l) => l.atraso_min > 0).length,
  };

  res.json({ funcionario: func, periodo: { from, to }, linhas, totais });
});

// Exportação CSV (abre no Excel) — PRD seção 15.
router.get("/espelho.csv", requireAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  const funcionarioId = req.query.funcionario_id as string;
  const { from, to } = req.query as Record<string, string>;
  if (!empresaId || !funcionarioId || !from || !to) return res.status(400).json({ error: "parâmetros obrigatórios ausentes" });

  const { func, registros, dias } = await carregarContexto(empresaId, funcionarioId, from, to);
  if (!func) return res.status(404).json({ error: "Funcionário não encontrado" });

  const head = ["Data", "Entrada", "Saida Almoco", "Retorno Almoco", "Saida Final", "Trabalhado", "Saldo", "Extra"];
  const linhas = dias.map((d) => {
    const m = (tipo: string) =>
      registros.find((r) => r.data === d.data && r.tipo === tipo)?.registrado_em?.slice(11, 16) || "";
    return [d.data, m("entrada"), m("saida_almoco"), m("retorno_almoco"), m("saida_final"), minToHHMM(d.trabalhado_min), minToHHMM(d.saldo_min), minToHHMM(d.extra_min)];
  });
  const csv = [head, ...linhas].map((r) => r.join(";")).join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="espelho_${func.matricula || funcionarioId}_${from}_${to}.csv"`);
  res.send("﻿" + csv); // BOM para acentuação correta no Excel
});

// Frequência consolidada da empresa no período (PRD seção 14/15).
router.get("/frequencia", requireAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  const { from, to } = req.query as Record<string, string>;
  if (!empresaId || !from || !to) return res.status(400).json({ error: "empresa_id, from e to são obrigatórios" });

  const funcionarios = await queryAll(
    "SELECT id, nome, departamento FROM funcionarios WHERE empresa_id = ? AND deleted_at IS NULL AND active = TRUE ORDER BY nome",
    [empresaId]
  );
  const resultado = [];
  for (const f of funcionarios) {
    const dias = await apurarPeriodo(empresaId, f.id, from, to);
    resultado.push({
      funcionario_id: f.id,
      nome: f.nome,
      departamento: f.departamento,
      trabalhado_min: dias.reduce((s, d) => s + d.trabalhado_min, 0),
      saldo_min: dias.reduce((s, d) => s + d.saldo_min, 0),
      extra_min: dias.reduce((s, d) => s + d.extra_min, 0),
      faltas: dias.filter((d) => d.esperado_min > 0 && d.trabalhado_min === 0).length,
    });
  }
  res.json({ periodo: { from, to }, funcionarios: resultado });
});

export default router;
