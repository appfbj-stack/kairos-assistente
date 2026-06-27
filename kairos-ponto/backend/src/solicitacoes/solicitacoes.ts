import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireAuth, requireRole, scopeEmpresaId } from "../core/auth.js";
import type { AuthUser } from "../core/types.js";
import { audit } from "../core/audit.js";

const router = Router();

const TIPOS = ["ajuste_ponto", "folga", "justificativa", "correcao_horario"];

/**
 * Solicitações do funcionário (PRD seção 13).
 * Fluxo: solicitado → em_analise → aprovado/rejeitado.
 */

// Funcionário cria solicitação para si; gestor pode criar para um funcionário da empresa.
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  let { funcionario_id, tipo, descricao, payload, empresa_id } = req.body;
  if (!tipo || !TIPOS.includes(tipo)) return res.status(400).json({ error: "tipo inválido" });

  if (actor.role === "FUNCIONARIO") {
    if (!actor.funcionario_id) return res.status(403).json({ error: "Usuário não vinculado a um funcionário" });
    funcionario_id = actor.funcionario_id;
  }
  if (!funcionario_id) return res.status(400).json({ error: "funcionario_id é obrigatório" });

  const funcionario = await queryOne("SELECT empresa_id FROM funcionarios WHERE id = ?", [funcionario_id]);
  if (!funcionario) return res.status(404).json({ error: "Funcionário não encontrado" });
  const empresaId = actor.role === "SUPER_ADMIN" ? empresa_id || funcionario.empresa_id : actor.empresa_id;
  if (funcionario.empresa_id !== empresaId) return res.status(403).json({ error: "Sem acesso" });

  const id = crypto.randomUUID();
  await runSql(
    "INSERT INTO solicitacoes (id, empresa_id, funcionario_id, tipo, descricao, payload) VALUES (?, ?, ?, ?, ?, ?)",
    [id, empresaId, funcionario_id, tipo, descricao || "", JSON.stringify(payload || {})]
  );
  await audit(req, "solicitacao.criar", { entity: "solicitacao", entityId: id, details: tipo, empresaId });
  res.status(201).json({ id, tipo, status: "solicitado" });
});

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

  const conditions = ["s.empresa_id = ?"];
  const params: any[] = [empresaId];
  if (actor.role === "FUNCIONARIO") {
    conditions.push("s.funcionario_id = ?");
    params.push(actor.funcionario_id);
  }
  if (req.query.status) {
    conditions.push("s.status = ?");
    params.push(req.query.status);
  }

  const rows = await queryAll(
    `SELECT s.*, f.nome as funcionario_nome
     FROM solicitacoes s JOIN funcionarios f ON f.id = s.funcionario_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY s.created_at DESC`,
    params
  );
  res.json(rows);
});

// Aprovar/rejeitar (PRD seção 5: Supervisor e Administrador aprovam).
router.patch(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"),
  async (req: Request, res: Response) => {
    const actor = (req as any).user as AuthUser;
    const empresaId = scopeEmpresaId(req);
    const { status, resposta } = req.body;
    if (!["em_analise", "aprovado", "rejeitado"].includes(status)) {
      return res.status(400).json({ error: "status inválido" });
    }

    const sol = await queryOne("SELECT * FROM solicitacoes WHERE id = ?", [req.params.id]);
    if (!sol) return res.status(404).json({ error: "Solicitação não encontrada" });
    if (empresaId && sol.empresa_id !== empresaId) return res.status(403).json({ error: "Sem acesso" });

    const resolved = status === "aprovado" || status === "rejeitado";
    await runSql(
      `UPDATE solicitacoes SET status = ?, resposta = ?, aprovador_id = ?, updated_at = NOW(), resolved_at = ${resolved ? "NOW()" : "resolved_at"} WHERE id = ?`,
      [status, resposta || "", actor.id, req.params.id]
    );

    // Notifica o funcionário sobre a decisão (PRD seção 17).
    const func = await queryOne("SELECT user_id, nome FROM funcionarios WHERE id = ?", [sol.funcionario_id]);
    if (func?.user_id) {
      await runSql(
        "INSERT INTO notificacoes (id, empresa_id, user_id, funcionario_id, tipo, titulo, mensagem) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          crypto.randomUUID(),
          sol.empresa_id,
          func.user_id,
          sol.funcionario_id,
          status === "aprovado" ? "sucesso" : "info",
          `Solicitação ${status}`,
          resposta || `Sua solicitação de ${sol.tipo} foi ${status}.`,
        ]
      );
    }
    await audit(req, "solicitacao.decidir", { entity: "solicitacao", entityId: req.params.id, details: status, empresaId: sol.empresa_id });
    res.json({ ok: true, status });
  }
);

export default router;
