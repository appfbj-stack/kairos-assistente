import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireAuth, requireRole, scopeEmpresaId, hashPassword } from "../core/auth.js";
import type { AuthUser } from "../core/types.js";
import { audit } from "../core/audit.js";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

  const search = (req.query.search as string | undefined) || "";
  const rows = await queryAll(
    `SELECT f.*, e.nome as escala_nome
     FROM funcionarios f
     LEFT JOIN escalas e ON e.id = f.escala_id
     WHERE f.empresa_id = ? AND f.deleted_at IS NULL
       AND (f.nome ILIKE ? OR f.cpf ILIKE ? OR f.matricula ILIKE ?)
     ORDER BY f.nome`,
    [empresaId, `%${search}%`, `%${search}%`, `%${search}%`]
  );
  res.json(rows);
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req);
  const row = await queryOne("SELECT * FROM funcionarios WHERE id = ? AND deleted_at IS NULL", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Funcionário não encontrado" });
  if (empresaId && row.empresa_id !== empresaId) return res.status(403).json({ error: "Sem acesso" });
  res.json(row);
});

router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA"),
  async (req: Request, res: Response) => {
    const actor = (req as any).user as AuthUser;
    const {
      nome,
      cpf,
      email,
      telefone,
      cargo,
      departamento,
      matricula,
      data_admissao,
      foto_facial,
      escala_id,
      supervisor_id,
      empresa_id,
      // Se enviado, cria também um login (ponto_users role FUNCIONARIO) vinculado.
      criar_acesso,
      senha_acesso,
    } = req.body;
    if (!nome || !cpf) return res.status(400).json({ error: "nome e cpf são obrigatórios" });

    const empresaId = actor.role === "SUPER_ADMIN" ? empresa_id : actor.empresa_id;
    if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

    const dup = await queryOne("SELECT id FROM funcionarios WHERE empresa_id = ? AND cpf = ? AND deleted_at IS NULL", [
      empresaId,
      cpf,
    ]);
    if (dup) return res.status(409).json({ error: "Já existe funcionário com este CPF nesta empresa" });

    let userId: string | null = null;
    if (criar_acesso && email) {
      const existsUser = await queryOne("SELECT id FROM ponto_users WHERE email = ?", [email]);
      if (existsUser) return res.status(409).json({ error: "E-mail de acesso já cadastrado" });
      userId = crypto.randomUUID();
      const hash = await hashPassword(senha_acesso || cpf.replace(/\D/g, "").slice(0, 6) || "123456");
      await runSql(
        "INSERT INTO ponto_users (id, empresa_id, name, email, password_hash, role, created_by) VALUES (?, ?, ?, ?, ?, 'FUNCIONARIO', ?)",
        [userId, empresaId, nome, email, hash, actor.id]
      );
    }

    const id = crypto.randomUUID();
    await runSql(
      `INSERT INTO funcionarios
        (id, empresa_id, user_id, supervisor_id, escala_id, nome, cpf, email, telefone, cargo, departamento, matricula, data_admissao, foto_facial)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empresaId,
        userId,
        supervisor_id || null,
        escala_id || null,
        nome,
        cpf,
        email || "",
        telefone || "",
        cargo || "",
        departamento || "",
        matricula || "",
        data_admissao || null,
        foto_facial || "",
      ]
    );
    await audit(req, "funcionario.criar", { entity: "funcionario", entityId: id, details: nome, empresaId });
    res.status(201).json({ id, nome, cpf, user_id: userId });
  }
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req);
    const existing = await queryOne("SELECT empresa_id FROM funcionarios WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: "Funcionário não encontrado" });
    if (empresaId && existing.empresa_id !== empresaId) return res.status(403).json({ error: "Sem acesso" });

    const {
      nome,
      email,
      telefone,
      cargo,
      departamento,
      matricula,
      data_admissao,
      foto_facial,
      escala_id,
      supervisor_id,
      active,
    } = req.body;
    await runSql(
      `UPDATE funcionarios SET
        nome = COALESCE(?, nome),
        email = COALESCE(?, email),
        telefone = COALESCE(?, telefone),
        cargo = COALESCE(?, cargo),
        departamento = COALESCE(?, departamento),
        matricula = COALESCE(?, matricula),
        data_admissao = COALESCE(?, data_admissao),
        foto_facial = COALESCE(?, foto_facial),
        escala_id = COALESCE(?, escala_id),
        supervisor_id = COALESCE(?, supervisor_id),
        active = COALESCE(?, active),
        updated_at = NOW()
       WHERE id = ?`,
      [
        nome ?? null,
        email ?? null,
        telefone ?? null,
        cargo ?? null,
        departamento ?? null,
        matricula ?? null,
        data_admissao ?? null,
        foto_facial ?? null,
        escala_id ?? null,
        supervisor_id ?? null,
        active ?? null,
        req.params.id,
      ]
    );
    await audit(req, "funcionario.atualizar", { entity: "funcionario", entityId: req.params.id });
    res.json({ ok: true });
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req);
    const existing = await queryOne("SELECT empresa_id FROM funcionarios WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: "Funcionário não encontrado" });
    if (empresaId && existing.empresa_id !== empresaId) return res.status(403).json({ error: "Sem acesso" });

    await runSql("UPDATE funcionarios SET deleted_at = NOW(), active = FALSE WHERE id = ?", [req.params.id]);
    await audit(req, "funcionario.excluir", { entity: "funcionario", entityId: req.params.id });
    res.json({ ok: true });
  }
);

export default router;
