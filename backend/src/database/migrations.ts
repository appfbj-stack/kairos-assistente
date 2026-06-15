import { runMany, queryAll, runSql, getDb } from "./database.js";

const MIGRATIONS_TABLE = "_migrations";

async function ensureMigrationsTable() {
  const db = await getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

const migrations = [
  {
    name: "001_licensing",
    sql: `
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        category TEXT NOT NULL DEFAULT 'Outros',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS apps (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS licenses (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        app_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'trial' CHECK(status IN ('trial','active','expired','blocked')),
        type TEXT NOT NULL DEFAULT 'temporary' CHECK(type IN ('temporary','permanent')),
        start_date TEXT NOT NULL DEFAULT (datetime('now')),
        end_date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
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
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        license_id TEXT NOT NULL,
        amount REAL NOT NULL,
        method TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE
      );
    `,
  },
];

export async function runMigrations() {
  await ensureMigrationsTable();

  const applied = queryAll(`SELECT name FROM ${MIGRATIONS_TABLE}`);
  const appliedNames = new Set(applied.map((r: any) => r.name));

  for (const m of migrations) {
    if (!appliedNames.has(m.name)) {
      try {
        runMany(m.sql);
      runSql(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`, [m.name]);
        console.log(`Migração aplicada: ${m.name}`);
      } catch (err: any) {
        console.error(`Erro na migração ${m.name}: ${err.message}`);
      }
    }
  }
}
