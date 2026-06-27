import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireAuth, requireRole, scopeEmpresaId } from "../core/auth.js";
import type { AuthUser } from "../core/types.js";
import { audit } from "../core/audit.js";
import { apurarPeriodo } from "./apuracao.js";

const router = Router();

function funcionarioDoActor(req: Request): string | null {
  const actor = (req as any).user as AuthUser;
  if (actor.role === "FUNCIONARIO") return actor.funcionario_id ?? null;
  return (req.query.funcionario_id as string) || (req.body?.funcionario_id as string) || null;
}

// Saldo do banco de horas (PRD seção 11).
router.get("/saldo", requireAuth, async (req: Request, res: Response) => {
  const funcionarioId = funcionarioDoActor(req);
  if (!funcionarioId) return res.status(400).json({ error: "funcionario_id é obrigatório" });
  const row = await queryOne(
    "SELECT COALESCE(SUM(minutos),0) as saldo_min FROM banco_horas_movimentos WHERE funcionario_id = ?",
    [funcionarioId]
  );
  const saldo = Number(row?.saldo_min || 0);
  res.json({ funcionario_id: funcionarioId, saldo_minutos: saldo, saldo_horas: +(saldo / 60).toFixed(2) });
});

router.get("/movimentos", requireAuth, async (req: Request, res: Response) => {
  const funcionarioId = funcionarioDoActor(req);
  if (!funcionarioId) return res.status(400).json({ error: "funcionario_id é obrigatório" });
  const rows = await queryAll(
    "SELECT * FROM banco_horas_movimentos WHERE funcionario_id = ? ORDER BY data DESC, created_at DESC LIMIT 500",
    [funcionarioId]
  );
  res.json(rows);
});

// Lançamento manual (crédito/débito/ajuste) por gestor.
router.post(
  "/movimentos",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req, req.body.empresa_id);
    const { funcionario_id, data, minutos, tipo, descricao } = req.body;
    if (!funcionario_id || minutos == null || !tipo) {
      return res.status(400).json({ error: "funcionario_id, minutos e tipo são obrigatórios" });
    }
    if (!["credito", "debito", "extra", "ajuste"].includes(tipo)) return res.status(400).json({ error: "tipo inválido" });

    const func = await queryOne("SELECT empresa_id FROM funcionarios WHERE id = ?", [funcionario_id]);
    if (!func) return res.status(404).json({ error: "Funcionário não encontrado" });
    if (empresaId && func.empresa_id !== empresaId) return res.status(403).json({ error: "Sem acesso" });

    const id = crypto.randomUUID();
    await runSql(
      "INSERT INTO banco_horas_movimentos (id, empresa_id, funcionario_id, data, minutos, tipo, origem, descricao) VALUES (?, ?, ?, ?, ?, ?, 'manual', ?)",
      [id, func.empresa_id, funcionario_id, data || new Date().toISOString().slice(0, 10), Math.round(minutos), tipo, descricao || ""]
    );
    await audit(req, "banco_horas.lancar", { entity: "banco_horas", entityId: id, details: `${tipo} ${minutos}min`, empresaId: func.empresa_id });
    res.status(201).json({ id });
  }
);

/**
 * Apura um período e grava os movimentos do banco de horas (PRD seção 11/12).
 * Recalcula de forma idempotente: remove os movimentos de origem 'apuracao' do
 * período antes de regravar, evitando duplicar saldo em reprocessamentos.
 */
router.post(
  "/apurar",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req, req.body.empresa_id);
    const { funcionario_id, from, to } = req.body;
    if (!funcionario_id || !from || !to) return res.status(400).json({ error: "funcionario_id, from e to são obrigatórios" });

    const func = await queryOne("SELECT empresa_id FROM funcionarios WHERE id = ?", [funcionario_id]);
    if (!func) return res.status(404).json({ error: "Funcionário não encontrado" });
    if (empresaId && func.empresa_id !== empresaId) return res.status(403).json({ error: "Sem acesso" });

    const dias = await apurarPeriodo(func.empresa_id, funcionario_id, from, to);

    await runSql(
      "DELETE FROM banco_horas_movimentos WHERE funcionario_id = ? AND origem = 'apuracao' AND data >= ? AND data <= ?",
      [funcionario_id, from, to]
    );

    let totalSaldo = 0;
    let totalExtra = 0;
    for (const d of dias) {
      if (d.saldo_min === 0) continue;
      const tipo = d.esperado_min === 0 && d.trabalhado_min > 0 ? "extra" : d.saldo_min > 0 ? "credito" : "debito";
      await runSql(
        "INSERT INTO banco_horas_movimentos (id, empresa_id, funcionario_id, data, minutos, tipo, origem, descricao) VALUES (?, ?, ?, ?, ?, ?, 'apuracao', ?)",
        [crypto.randomUUID(), func.empresa_id, funcionario_id, d.data, d.saldo_min, tipo, `trabalhado=${d.trabalhado_min} esperado=${d.esperado_min}`]
      );
      totalSaldo += d.saldo_min;
      totalExtra += d.extra_min;
    }
    await audit(req, "banco_horas.apurar", { entity: "funcionario", entityId: funcionario_id, details: `${from}..${to}`, empresaId: func.empresa_id });
    res.json({ funcionario_id, from, to, dias, total_saldo_min: totalSaldo, total_extra_min: totalExtra });
  }
);

export default router;
