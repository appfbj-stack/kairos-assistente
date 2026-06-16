import { queryAll, runSql, getDb } from "./database.js";

const MIGRATIONS_TABLE = "_migrations";

async function ensureMigrationsTable() {
  await getDb();
  await runSql(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
    )
  `);
}

const TS = "TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')";

const migrations = [
  {
    name: "001_core_tables",
    sql: `
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Nova conversa',
        created_at TEXT NOT NULL DEFAULT ${TS},
        updated_at TEXT NOT NULL DEFAULT ${TS}
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT ${TS},
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS agenda_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        date_time TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done','cancelled')),
        created_at TEXT NOT NULL DEFAULT ${TS},
        updated_at TEXT NOT NULL DEFAULT ${TS}
      );

      CREATE TABLE IF NOT EXISTS memory_items (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        created_at TEXT NOT NULL DEFAULT ${TS},
        updated_at TEXT NOT NULL DEFAULT ${TS}
      );

      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT ${TS},
        updated_at TEXT NOT NULL DEFAULT ${TS}
      );
    `,
  },
  {
    name: "002_licensing",
    sql: `
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        category TEXT NOT NULL DEFAULT 'Outros',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT ${TS},
        updated_at TEXT NOT NULL DEFAULT ${TS}
      );

      CREATE TABLE IF NOT EXISTS apps (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        url TEXT DEFAULT '',
        version TEXT DEFAULT '1.0.0',
        category TEXT DEFAULT 'SaaS',
        plan TEXT DEFAULT 'Lite' CHECK(plan IN ('Lite','Pro')),
        status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
        created_at TEXT NOT NULL DEFAULT ${TS}
      );

      CREATE TABLE IF NOT EXISTS licenses (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        app_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'trial' CHECK(status IN ('trial','active','expired','blocked')),
        type TEXT NOT NULL DEFAULT 'temporary' CHECK(type IN ('temporary','permanent')),
        start_date TEXT NOT NULL DEFAULT ${TS},
        end_date TEXT,
        created_at TEXT NOT NULL DEFAULT ${TS},
        updated_at TEXT NOT NULL DEFAULT ${TS},
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        client_id TEXT,
        app_id TEXT,
        action TEXT NOT NULL,
        details TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT ${TS}
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        license_id TEXT NOT NULL,
        amount FLOAT NOT NULL,
        method TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled')),
        created_at TEXT NOT NULL DEFAULT ${TS},
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE
      );
    `,
  },
];

export async function runMigrations() {
  await ensureMigrationsTable();

  const applied = await queryAll(`SELECT name FROM ${MIGRATIONS_TABLE}`);
  const appliedNames = new Set(applied.map((r: any) => r.name));

  for (const m of migrations) {
    if (!appliedNames.has(m.name)) {
      try {
        const statements = m.sql
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const stmt of statements) {
          await runSql(stmt);
        }
        await runSql(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`, [m.name]);
        console.log(`Migração aplicada: ${m.name}`);
      } catch (err: any) {
        console.error(`Erro na migração ${m.name}: ${err.message}`);
      }
    }
  }
}
