import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { hashPassword, verifyPassword, signAuthToken, requireCoreAuth, requireRole } from "./auth.js";
import type { AuthUser } from "./types.js";
import { CORE_ROLES } from "./types.js";

const router = Router();

router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email e password obrigatórios" });

  const row = await queryOne(
    "SELECT * FROM core_users WHERE email = ? AND active = TRUE AND deleted_at IS NULL",
    [email]
  );
  if (!row) return res.status(401).json({ error: "Credenciais inválidas" });

  const ok = await verifyPassword(password, (row as any).password_hash);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

  const user: AuthUser = {
    id: (row as any).id,
    empresa_id: (row as any).empresa_id,
    email: (row as any).email,
    role: (row as any).role,
  };
  const token = signAuthToken(user);
  res.json({ token, user });
});

// SUPER_ADMIN cria qualquer usuário; ADMIN_EMPRESA cria usuários da própria empresa
router.post("/", requireCoreAuth, requireRole("SUPER_ADMIN", "ADMIN_EMPRESA"), async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  const { name, email, password, role, empresa_id } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password e role são obrigatórios" });
  }
  if (!CORE_ROLES.includes(role)) return res.status(400).json({ error: "role inválida" });

  const targetEmpresaId = actor.role === "SUPER_ADMIN" ? (empresa_id ?? null) : actor.empresa_id;
  if (role !== "SUPER_ADMIN" && !targetEmpresaId) {
    return res.status(400).json({ error: "empresa_id é obrigatório para esta role" });
  }
  if (actor.role === "ADMIN_EMPRESA" && role === "SUPER_ADMIN") {
    return res.status(403).json({ error: "ADMIN_EMPRESA não pode criar SUPER_ADMIN" });
  }

  const existing = await queryOne("SELECT id FROM core_users WHERE email = ?", [email]);
  if (existing) return res.status(409).json({ error: "E-mail já cadastrado" });

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  await runSql(
    "INSERT INTO core_users (id, empresa_id, name, email, password_hash, role, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, targetEmpresaId, name, email, passwordHash, role, actor.id, actor.id]
  );

  res.status(201).json({ id, name, email, role, empresa_id: targetEmpresaId });
});

router.get("/", requireCoreAuth, async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  if (actor.role === "SUPER_ADMIN") {
    const rows = await queryAll(
      "SELECT id, empresa_id, name, email, role, active, created_at FROM core_users WHERE deleted_at IS NULL ORDER BY created_at DESC"
    );
    return res.json(rows);
  }
  const rows = await queryAll(
    "SELECT id, empresa_id, name, email, role, active, created_at FROM core_users WHERE empresa_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
    [actor.empresa_id]
  );
  res.json(rows);
});

export default router;
