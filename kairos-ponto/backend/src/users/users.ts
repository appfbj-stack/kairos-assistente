import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import {
  hashPassword,
  verifyPassword,
  signAuthToken,
  requireAuth,
  requireRole,
} from "../core/auth.js";
import type { AuthUser } from "../core/types.js";
import { PONTO_ROLES } from "../core/types.js";
import { audit } from "../core/audit.js";
import { rateLimit } from "../core/rateLimit.js";

const router = Router();

// Login — rate limited contra força bruta (PRD seção 19).
router.post("/auth/login", rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "login" }), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email e password obrigatórios" });

  const row = await queryOne(
    "SELECT * FROM ponto_users WHERE email = ? AND active = TRUE AND deleted_at IS NULL",
    [email]
  );
  if (!row) return res.status(401).json({ error: "Credenciais inválidas" });

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

  // Vincula o funcionário (se o usuário for um colaborador) para o app de ponto.
  const func = await queryOne("SELECT id FROM funcionarios WHERE user_id = ? AND deleted_at IS NULL", [row.id]);

  const user: AuthUser = {
    id: row.id,
    empresa_id: row.empresa_id,
    email: row.email,
    role: row.role,
    funcionario_id: func?.id ?? null,
  };
  const token = signAuthToken(user);
  await audit(req, "auth.login", { entity: "user", entityId: row.id, empresaId: row.empresa_id });
  res.json({ token, user: { ...user, name: row.name } });
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  const row = await queryOne("SELECT id, empresa_id, name, email, role FROM ponto_users WHERE id = ?", [actor.id]);
  res.json({ ...row, funcionario_id: actor.funcionario_id ?? null });
});

// SUPER_ADMIN cria qualquer usuário; ADMIN_EMPRESA cria usuários da própria empresa.
router.post("/", requireAuth, requireRole("SUPER_ADMIN", "ADMIN_EMPRESA"), async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  const { name, email, password, role, empresa_id } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password e role são obrigatórios" });
  }
  if (!PONTO_ROLES.includes(role)) return res.status(400).json({ error: "role inválida" });

  const targetEmpresaId = actor.role === "SUPER_ADMIN" ? (empresa_id ?? null) : actor.empresa_id;
  if (role !== "SUPER_ADMIN" && !targetEmpresaId) {
    return res.status(400).json({ error: "empresa_id é obrigatório para esta role" });
  }
  if (actor.role === "ADMIN_EMPRESA" && role === "SUPER_ADMIN") {
    return res.status(403).json({ error: "ADMIN_EMPRESA não pode criar SUPER_ADMIN" });
  }

  const existing = await queryOne("SELECT id FROM ponto_users WHERE email = ?", [email]);
  if (existing) return res.status(409).json({ error: "E-mail já cadastrado" });

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  await runSql(
    "INSERT INTO ponto_users (id, empresa_id, name, email, password_hash, role, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, targetEmpresaId, name, email, passwordHash, role, actor.id]
  );
  await audit(req, "user.criar", { entity: "user", entityId: id, details: `${email} (${role})`, empresaId: targetEmpresaId });
  res.status(201).json({ id, name, email, role, empresa_id: targetEmpresaId });
});

router.get("/", requireAuth, requireRole("SUPER_ADMIN", "ADMIN_EMPRESA"), async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  if (actor.role === "SUPER_ADMIN") {
    const rows = await queryAll(
      "SELECT id, empresa_id, name, email, role, active, created_at FROM ponto_users WHERE deleted_at IS NULL ORDER BY created_at DESC"
    );
    return res.json(rows);
  }
  const rows = await queryAll(
    "SELECT id, empresa_id, name, email, role, active, created_at FROM ponto_users WHERE empresa_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
    [actor.empresa_id]
  );
  res.json(rows);
});

router.patch("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN_EMPRESA"), async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  const target = await queryOne("SELECT empresa_id FROM ponto_users WHERE id = ?", [req.params.id]);
  if (!target) return res.status(404).json({ error: "Usuário não encontrado" });
  if (actor.role === "ADMIN_EMPRESA" && target.empresa_id !== actor.empresa_id) {
    return res.status(403).json({ error: "Sem acesso a este usuário" });
  }

  const { name, password, role, active } = req.body;
  const passwordHash = password ? await hashPassword(password) : null;
  await runSql(
    `UPDATE ponto_users SET
      name = COALESCE(?, name),
      password_hash = COALESCE(?, password_hash),
      role = COALESCE(?, role),
      active = COALESCE(?, active),
      updated_at = NOW()
     WHERE id = ?`,
    [name ?? null, passwordHash, role ?? null, active ?? null, req.params.id]
  );
  await audit(req, "user.atualizar", { entity: "user", entityId: req.params.id });
  res.json({ ok: true });
});

export default router;
