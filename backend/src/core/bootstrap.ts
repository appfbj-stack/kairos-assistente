import crypto from "crypto";
import { queryOne, runSql } from "../database/database.js";
import { hashPassword } from "./auth.js";

/** Cria o primeiro SUPER_ADMIN do Core se nenhum existir ainda. Idempotente. */
export async function bootstrapSuperAdmin(): Promise<void> {
  const email = process.env.CORE_SUPERADMIN_EMAIL;
  const password = process.env.CORE_SUPERADMIN_PASSWORD;
  if (!email || !password) {
    console.log("ℹ️  CORE_SUPERADMIN_EMAIL/CORE_SUPERADMIN_PASSWORD não definidos — pulando bootstrap do Core.");
    return;
  }

  const existing = await queryOne("SELECT id FROM core_users WHERE role = 'SUPER_ADMIN' LIMIT 1");
  if (existing) return;

  const passwordHash = await hashPassword(password);
  await runSql(
    "INSERT INTO core_users (id, empresa_id, name, email, password_hash, role) VALUES (?, NULL, ?, ?, ?, 'SUPER_ADMIN')",
    [crypto.randomUUID(), "Super Admin", email, passwordHash]
  );
  console.log(`✅ SUPER_ADMIN do Core criado (${email})`);
}
