import crypto from "crypto";
import { queryOne, runSql } from "../database/database.js";
import { hashPassword } from "./auth.js";

/**
 * Cria o SUPER_ADMIN inicial a partir das variáveis de ambiente, caso ainda
 * não exista nenhum. Idempotente.
 */
export async function bootstrapSuperAdmin(): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@kairosponto.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "admin123";
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";

  const existing = await queryOne("SELECT id FROM ponto_users WHERE role = 'SUPER_ADMIN' LIMIT 1");
  if (existing) return;

  const id = crypto.randomUUID();
  const hash = await hashPassword(password);
  await runSql(
    "INSERT INTO ponto_users (id, empresa_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, 'SUPER_ADMIN')",
    [id, null, name, email, hash]
  );
  console.log(`SUPER_ADMIN criado: ${email}`);
}
