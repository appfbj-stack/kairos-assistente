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
          database: process.env.POSTGRES_DB || "kairos_ponto",
          user: process.env.POSTGRES_USER || "kairos_ponto",
          password: process.env.POSTGRES_PASSWORD || "kairos_ponto",
        };
    _pool = new Pool(config);
    _pool.on("error", (err) => console.error("PostgreSQL pool error:", err));
  }
  return _pool;
}

/**
 * Converte placeholders `?` no estilo posicional do Postgres (`$1`, `$2`...).
 * Mesma convenção usada no núcleo Kairos, para manter as queries portáveis.
 */
function toPg(sql: string): string {
  let i = 0;
  return sql
    .replace(/\?/g, () => `$${++i}`)
    .replace(/datetime\('now'\)/gi, "NOW()");
}

export async function getDb(): Promise<void> {
  await getPool().query("SELECT 1");
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
