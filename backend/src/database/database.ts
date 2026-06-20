import pg from "pg";

const { Pool } = pg;

let _pool: InstanceType<typeof Pool> | null = null;

function getPool(): InstanceType<typeof Pool> {
  if (!_pool) {
    const config: pg.PoolConfig = process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.POSTGRES_HOST || "postgres",
          port: Number(process.env.POSTGRES_PORT) || 5432,
          database: process.env.POSTGRES_DB || "kairos",
          user: process.env.POSTGRES_USER || "kairos",
          password: process.env.POSTGRES_PASSWORD || "kairos123",
        };
    _pool = new Pool({ ...config, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    _pool.on("error", (err) => console.error("PostgreSQL pool error:", err));
  }
  return _pool;
}

function toPg(sql: string): string {
  let i = 0;
  return sql
    .replace(/\?/g, () => `$${++i}`)
    .replace(/datetime\('now'\)/gi, "NOW()")
    .replace(/datetime\('now',\s*'localtime'\)/gi, "NOW()")
    .replace(/DATE\('now',\s*'([^']+)'\)/gi, "CURRENT_DATE + INTERVAL '$1'");
}

export async function getDb(): Promise<void> {
  let lastErr: any;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await getPool().query("SELECT 1");
      return;
    } catch (err: any) {
      lastErr = err;
      if (err.code !== "28P01" && err.code !== "ECONNREFUSED" && attempt < 5) {
        await new Promise(r => setTimeout(r, attempt * 2000));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function queryAll(sql: string, params: any[] = []): Promise<any[]> {
  const result = await getPool().query(toPg(sql), params);
  return result.rows;
}

export async function queryOne(sql: string, params: any[] = []): Promise<any | null> {
  const rows = await queryAll(sql, params);
  return rows[0] ?? null;
}

export async function runSql(sql: string, params: any[] = []): Promise<void> {
  await getPool().query(toPg(sql), params);
}

export async function runMany(sql: string): Promise<void> {
  // Split by semicolons and run each statement
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await getPool().query(toPg(stmt));
  }
}

export function saveDb(): void {
  // No-op for PostgreSQL (always persistent)
}
